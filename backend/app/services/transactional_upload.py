"""
[IDENTITY]: Transactional Upload Service
Two-Phase Commit Protocol for Asset Upload with TTL Management.

[INPUT]:
- Database Session, Workspace ID, Upload Request.

[LINK]:
- Model_Asset -> ../models/asset.py
- StorageService -> ./storage_service.py
- Config -> ../core/config.py

[OUTPUT]: Asset Record with TTL Protection.
[POS]: /backend/app/services/transactional_upload.py

[PROTOCOL]:
1. **Phase 1 (Prepare)**: Create Asset with PENDING_UPLOAD status + Redis TTL.
2. **Phase 2 (Confirm)**: Verify upload in MinIO and commit final status.
3. **TTL Cleanup**: Expired PENDING records are automatically cleaned up.
4. **Idempotency**: Confirm operations are idempotent (safe to retry).
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Any

import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.asset import Asset, StorageStatus
from app.services.storage_service import get_storage_service, StorageService

logger = logging.getLogger(__name__)

# TTL 配置常量
DEFAULT_UPLOAD_TTL_SECONDS = 3600  # 1小时过期
CLEANUP_STALE_THRESHOLD_MINUTES = 10  # 10分钟无确认视为过期


class TransactionalUploadService:
    """
    两阶段提交上传服务。
    
    解决的问题：
    - Asset 记录创建与文件上传不同步导致的数据不一致
    - 缺少 TTL 机制清理过期的 PENDING 记录
    """
    
    def __init__(
        self,
        storage_service: Optional[StorageService] = None,
        ttl_seconds: int = DEFAULT_UPLOAD_TTL_SECONDS,
    ):
        """
        初始化服务。
        
        Args:
            storage_service: MinIO 存储服务实例
            ttl_seconds: 上传 TTL 秒数，超时后记录可被清理
        """
        self._storage = storage_service or get_storage_service()
        self._ttl_seconds = ttl_seconds
        self._redis: Optional[redis.Redis] = None
    
    async def _get_redis(self) -> redis.Redis:
        """获取或创建 Redis 连接。"""
        if self._redis is None:
            settings = get_settings()
            self._redis = redis.from_url(settings.redis_url, decode_responses=True)
        return self._redis
    
    def _get_ttl_key(self, asset_id: str) -> str:
        """生成 TTL 跟踪的 Redis key。"""
        return f"upload:ttl:{asset_id}"
    
    async def prepare_upload(
        self,
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        filename: str,
        content_type: str,
        file_size: int,
        checksum: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        阶段1：准备上传 - 创建临时 Asset 记录并设置 TTL。
        
        Args:
            db: 数据库会话
            workspace_id: 工作区 ID
            user_id: 上传用户 ID
            filename: 文件名
            content_type: MIME 类型
            file_size: 文件大小（字节）
            checksum: 可选的文件校验和
            
        Returns:
            包含 asset_id, upload_url, storage_path, expires_in 的字典
        """
        # 阶段1.1: 创建 Asset 记录（PENDING_UPLOAD 状态）
        asset = Asset(
            workspace_id=workspace_id,
            name=filename,
            mime_type=content_type,
            size=file_size,
            storage_status=StorageStatus.PENDING_UPLOAD,
            uploaded_by=user_id,
            file_checksum=checksum,
        )
        
        db.add(asset)
        await db.commit()
        await db.refresh(asset)
        
        logger.info(
            f"Phase 1.1: Created asset {asset.id} with PENDING_UPLOAD status"
        )
        
        # 阶段1.2: 设置 Redis TTL 追踪
        await self._set_ttl(str(asset.id), self._ttl_seconds)
        
        # 阶段1.3: 生成预签名上传 URL
        upload_info = self._storage.generate_upload_url(
            workspace_id=str(workspace_id),
            asset_id=str(asset.id),
            filename=filename,
            expires_minutes=60,  # 1小时有效
        )
        
        # 阶段1.4: 更新 Asset 状态为 UPLOADING
        asset.storage_path = upload_info["storage_path"]
        asset.storage_status = StorageStatus.UPLOADING
        await db.commit()
        
        logger.info(
            f"Phase 1 complete: Asset {asset.id} ready for upload, TTL={self._ttl_seconds}s"
        )
        
        return {
            "asset_id": str(asset.id),
            "upload_url": upload_info["upload_url"],
            "storage_path": upload_info["storage_path"],
            "expires_in": upload_info["expires_in"],
        }
    
    async def _set_ttl(self, asset_id: str, ttl_seconds: int) -> None:
        """设置 Asset 的 TTL 追踪。"""
        r = await self._get_redis()
        key = self._get_ttl_key(asset_id)
        # 存储创建时间戳，用于后续清理判断
        await r.set(key, datetime.now(timezone.utc).isoformat(), ex=ttl_seconds)
        logger.debug(f"Set TTL for asset {asset_id}: {ttl_seconds}s")
    
    async def _clear_ttl(self, asset_id: str) -> None:
        """清除 Asset 的 TTL 追踪（上传确认后调用）。"""
        r = await self._get_redis()
        key = self._get_ttl_key(asset_id)
        await r.delete(key)
        logger.debug(f"Cleared TTL for asset {asset_id}")
    
    async def confirm_upload(
        self,
        db: AsyncSession,
        workspace_id: uuid.UUID,
        asset_id: str,
        actual_file_size: int,
        actual_checksum: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        阶段2：确认上传 - 验证 MinIO 文件并提交最终状态。
        
        此方法是幂等的：如果 Asset 已是 UPLOADED 状态，直接返回成功。
        
        Args:
            db: 数据库会话
            workspace_id: 工作区 ID
            asset_id: Asset UUID 字符串
            actual_file_size: 实际上传的文件大小
            actual_checksum: 可选的实际文件校验和
            
        Returns:
            包含 asset_id, verified, storage_status, file_size 的字典
            
        Raises:
            ValueError: 如果 Asset 不存在或验证失败
        """
        # 阶段2.1: 获取 Asset 记录（带行级锁防止并发）
        stmt = select(Asset).where(
            Asset.id == uuid.UUID(asset_id),
            Asset.workspace_id == workspace_id,
        ).with_for_update()
        
        result = await db.execute(stmt)
        asset = result.scalar_one_or_none()
        
        if not asset:
            raise ValueError(f"Asset not found: {asset_id}")
        
        # 幂等性检查：已确认的直接返回
        if asset.storage_status == StorageStatus.UPLOADED:
            logger.info(f"Asset {asset_id} already confirmed (idempotent)")
            return {
                "asset_id": asset_id,
                "verified": True,
                "storage_status": "already_uploaded",
                "file_size": asset.size,
            }
        
        # 检查状态是否合法
        if asset.storage_status not in (
            StorageStatus.PENDING_UPLOAD,
            StorageStatus.UPLOADING,
        ):
            raise ValueError(
                f"Asset {asset_id} cannot be confirmed. "
                f"Current status: {asset.storage_status.value}"
            )
        
        # 阶段2.2: 验证 MinIO 上传
        try:
            verification = self._storage.verify_upload(
                workspace_id=str(workspace_id),
                asset_id=asset_id,
                filename=asset.name,
                expected_size=actual_file_size,
            )
            
            # 阶段2.3: 更新 Asset 为已上传状态
            asset.storage_status = StorageStatus.UPLOADED
            asset.size = verification["size"]
            if actual_checksum:
                asset.file_checksum = actual_checksum
            asset.updated_at = datetime.now(timezone.utc)
            
            await db.commit()
            await db.refresh(asset)
            
            # 阶段2.4: 清除 TTL 追踪
            await self._clear_ttl(asset_id)
            
            logger.info(
                f"Phase 2 complete: Asset {asset_id} confirmed, "
                f"size={asset.size} bytes"
            )
            
            return {
                "asset_id": asset_id,
                "verified": True,
                "storage_status": asset.storage_status.value,
                "file_size": asset.size,
            }
            
        except ValueError as e:
            # 验证失败，标记为 FAILED
            asset.storage_status = StorageStatus.FAILED
            asset.error_message = str(e)
            await db.commit()
            
            logger.error(f"Phase 2 failed for asset {asset_id}: {e}")
            raise
    
    async def cleanup_expired_assets(
        self,
        db: AsyncSession,
        stale_threshold_minutes: int = CLEANUP_STALE_THRESHOLD_MINUTES,
    ) -> int:
        """
        清理过期的 PENDING/UPLOADING 状态 Asset 记录。
        
        此方法应由定时任务（Celery Beat）调用。
        
        Args:
            db: 数据库会话
            stale_threshold_minutes: 超过此分钟数未确认的记录视为过期
            
        Returns:
            清理的记录数量
        """
        stale_threshold = datetime.now(timezone.utc) - timedelta(
            minutes=stale_threshold_minutes
        )
        
        # 查找过期的 UPLOADING 状态记录
        stmt = select(Asset).where(
            Asset.storage_status.in_([
                StorageStatus.PENDING_UPLOAD,
                StorageStatus.UPLOADING,
            ]),
            Asset.updated_at < stale_threshold,
        )
        
        result = await db.execute(stmt)
        stale_assets = result.scalars().all()
        
        cleaned_count = 0
        for asset in stale_assets:
            try:
                # 尝试验证是否实际上传成功
                verification = self._storage.verify_upload(
                    workspace_id=str(asset.workspace_id),
                    asset_id=str(asset.id),
                    filename=asset.name,
                )
                # 文件存在，更新为 UPLOADED
                asset.storage_status = StorageStatus.UPLOADED
                asset.size = verification["size"]
                logger.info(
                    f"Cleanup: Asset {asset.id} found in storage, marked UPLOADED"
                )
            except ValueError:
                # 文件不存在，标记为 FAILED
                asset.storage_status = StorageStatus.FAILED
                asset.error_message = "Upload expired without confirmation"
                logger.warning(
                    f"Cleanup: Asset {asset.id} not found in storage, marked FAILED"
                )
            
            # 清除 TTL 追踪
            await self._clear_ttl(str(asset.id))
            cleaned_count += 1
        
        if cleaned_count > 0:
            await db.commit()
            logger.info(f"Cleanup complete: processed {cleaned_count} stale assets")
        
        return cleaned_count
    
    async def close(self) -> None:
        """关闭 Redis 连接。"""
        if self._redis:
            await self._redis.close()
            self._redis = None


# =============================================================================
# 单例模式
# =============================================================================

_transactional_upload_service: Optional[TransactionalUploadService] = None


def get_transactional_upload_service() -> TransactionalUploadService:
    """
    获取或创建单例 TransactionalUploadService 实例。
    
    Returns:
        TransactionalUploadService: 配置好的服务实例
    """
    global _transactional_upload_service
    if _transactional_upload_service is None:
        _transactional_upload_service = TransactionalUploadService()
    return _transactional_upload_service


def reset_transactional_upload_service() -> None:
    """
    重置单例服务（用于测试）。
    """
    global _transactional_upload_service
    _transactional_upload_service = None
