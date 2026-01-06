# 测试缺陷清单 - 迭代1

**测试日期**: 2026-01-06
**测试范围**: 三条核心AI生成业务流程
**测试方法**: API直接测试 + Chrome DevTools浏览自动化计划

---

## ✅ 测试通过的功能

### 1. 文案生成流程
- **API端点**: `POST /api/v1/copy/workspaces/{workspace_id}/generate`
- **状态**: ✅ 完全通过
- **积分消耗**: 1
- **任务完成时间**: ~5秒
- **生成结果**: 3个标题选项

### 2. 图片生成流程
- **API端点**: `POST /api/v1/images/workspaces/{workspace_id}/generate`
- **状态**: ✅ 完全通过
- **积分消耗**: 5
- **任务完成时间**: ~5秒
- **生成结果**: 4张图片URL

### 3. 视频生成流程
- **API端点**:
  - `POST /api/v1/video/generate/script?workspace_id={id}` (脚本生成)
  - `POST /api/v1/video/workspaces/{workspace_id}/render/{project_id}` (视频渲染)
- **状态**: ✅ 完全通过
- **积分消耗**: 40 (脚本20 + 渲染20)
- **任务完成时间**: 脚本~20秒, 渲染~10秒
- **生成结果**: 完整视频URL

---

## 🔴 高优先级缺陷 (必须修复)

### 缺陷 #1: 文件上传功能未实现

**位置**: `/backend/app/api/v1/endpoints/assets.py:226-227`

**问题描述**:
```python
# TODO: In production, also store file to MinIO/S3
# await file_storage_service.upload(asset.id, file_content)

return asset
```

资产上传API只创建数据库记录,并未实际上传文件到MinIO。导致:
- 资产状态始终为`PENDING_UPLOAD`
- 图片/视频生成API检查状态时失败
- 错误信息: `"Asset is not uploaded. Status: pending_upload"`

**影响范围**:
- 所有需要资产作为输入的AI生成功能
- 文件存储完整性

**临时解决方案**:
手动更新数据库设置资产状态为`UPLOADED`:
```python
asset.storage_status = StorageStatus.UPLOADED
asset.storage_path = f'workspaces/{workspace_id}/assets/{asset_id}/{filename}'
```

**永久修复方案**:
1. 实现`FileStorageService.upload()`方法
2. 在资产上传API中调用MinIO上传
3. 上传成功后更新`storage_status`为`UPLOADED`
4. 处理上传失败的情况,设置`storage_status`为`FAILED`

**参考实现**:
- `/backend/app/services/storage_service.py` - 已有presigned URL生成逻辑
- 需要实现实际文件上传到MinIO

---

### 缺陷 #2: Redis缓存与数据库不同步

**位置**: `/backend/app/services/billing_service.py:80-127`

**问题描述**:
`get_credits()`方法优先从Redis读取缓存值,当数据库被手动更新后,Redis仍返回旧值。

**缓存逻辑**:
```python
async def get_credits(self, workspace_id: str) -> int:
    redis = await self._get_redis()
    redis_key = self._get_redis_key(workspace_id)

    # Try Redis first
    try:
        cached = await redis.get(redis_key)
        if cached is not None:
            return int(cached)  # ← 返回旧的缓存值
    except Exception as e:
        logger.warning(f"Redis get failed for {workspace_id}: {e}")

    # Fallback to database...
```

**影响范围**:
- 所有依赖积分的API端点
- 用户可能看到错误的积分余额
- 充值后需要手动清除Redis缓存才能生效

**临时解决方案**:
手动清除Redis缓存:
```bash
docker exec ebusiness_redis redis-cli DEL "billing:workspace:{workspace_id}:credits"
```

**永久修复方案**:
1. 在`deduct_credits()`方法中,同步更新Redis缓存
2. 提供管理API清除特定工作空间的缓存
3. 实现缓存失效机制,当数据库更新时自动清除缓存
4. 或者缩短缓存TTL时间(当前默认值需要确认)

**推荐方案**: 在写入操作中同步更新Redis:
```python
async def deduct_credits(self, workspace_id: str, amount: int) -> bool:
    # ... 数据库更新逻辑 ...

    # 同步更新Redis缓存
    redis = await self._get_redis()
    redis_key = self._get_redis_key(workspace_id)
    await redis.setex(redis_key, self.DEFAULT_TTL, new_credits)
```

---

## 🟡 中优先级缺陷 (影响体验)

### 缺陷 #3: 前端SessionProvider配置问题

**位置**: 前端代码 (具体位置待定位)

**问题描述**:
前端NextAuth SessionProvider可能未正确配置,导致会话管理不稳定。

**影响范围**:
- 用户登录状态持久化
- 跨页面会话保持

**建议修复**:
1. 检查`frontend/src/app/providers.tsx`或类似文件
2. 确保SessionProvider正确包裹应用
3. 验证session配置与后端JWT兼容

---

### 缺陷 #4: 测试计划API路由过时

**位置**: `/Users/ZenoWang/.claude/plans/shimmying-launching-kitten.md`

**问题描述**:
测试计划中部分API路由与实际代码不符,导致按文档测试会失败。

**示例**:

| 功能 | 文档中的路由 | 实际路由 |
|------|------------|---------|
| 图片生成 | `/workspaces/{id}/images/generate` | `/images/workspaces/{id}/generate` |
| 视频脚本 | `/api/v1/video/generate/script` (缺少workspace_id参数说明) | `/api/v1/video/generate/script?workspace_id={id}` |

**影响范围**:
- 新开发者按文档测试会失败
- 文档可信度降低

**解决方案**:
更新测试计划,与实际API路由保持一致

---

## 🟢 低优先级缺陷 (优化项)

### 缺陷 #5: VideoProject模型字段命名不一致

**位置**: `/backend/app/models/video.py`

**问题描述**:
尝试访问`VideoProject.script_content`字段,但实际字段为`script`

**实际字段名**:
- `script`: 存储脚本内容(列表)
- `storyboard`: 存储分镜板内容(列表)

**影响范围**:
- 代码可读性
- 可能的AttributeError

**解决方案**:
统一字段命名,或在文档中明确说明实际字段名

---

### 缺陷 #6: asyncpg数据库连接池管理

**位置**: 全局问题

**问题描述**:
异步连接池管理可能导致连接泄漏,特别是在Celery worker中。

**症状**:
- 长期运行可能导致连接耗尽
- 需要定期重启worker

**建议优化**:
1. 实现连接池监控
2. 设置合理的连接池大小和超时
3. 确保所有异步操作正确释放连接
4. 考虑使用连接池健康检查

---

## 📊 缺陷统计

| 优先级 | 数量 | 必须修复 |
|-------|-----|---------|
| 🔴 高 | 2 | 是 |
| 🟡 中 | 2 | 建议 |
| 🟢 低 | 2 | 可选 |

**总计**: 6个缺陷

---

## 🎯 下一步行动

### 迭代2修复清单:

1. **必须修复**:
   - [ ] 实现MinIO文件上传功能
   - [ ] 修复Redis缓存同步问题

2. **建议修复**:
   - [ ] 修复SessionProvider配置
   - [ ] 更新测试计划API路由

3. **可选优化**:
   - [ ] 统一VideoProject字段命名
   - [ ] 优化数据库连接池管理

### 完成标准:

- [ ] 所有高优先级缺陷修复
- [ ] 文件上传功能正常工作(无需手动绕过)
- [ ] 积分系统缓存正常工作(无需手动清除缓存)
- [ ] 三条业务流程完整测试通过

---

## 📁 相关文件

- 测试计划: `/Users/ZenoWang/.claude/plans/shimmying-launching-kitten.md`
- 资产上传: `/backend/app/api/v1/endpoints/assets.py`
- 存储服务: `/backend/app/services/storage_service.py`
- 计费服务: `/backend/app/services/billing_service.py`
- 计费模型: `/backend/app/models/user.py` (WorkspaceBilling)
- 资产模型: `/backend/app/models/asset.py`

---

**测试人员**: AI Agent (Ralph Loop 迭代1)
**审核状态**: 待审核
