"""
File Storage Service (AC: 160-165)

Provides file storage operations with S3/MinIO integration.
Handles file upload, download, and deletion for workspace assets.
"""

import uuid
from typing import Optional
from abc import ABC, abstractmethod

# Placeholder for production S3/MinIO client
# from minio import Minio


class FileStorageService(ABC):
    """Abstract base class for file storage operations."""
    
    @abstractmethod
    async def upload(self, file_id: uuid.UUID, content: bytes, content_type: str) -> str:
        """Upload file content and return storage path."""
        pass
    
    @abstractmethod
    async def download(self, file_id: uuid.UUID) -> Optional[bytes]:
        """Download file content by ID."""
        pass
    
    @abstractmethod
    async def delete(self, file_id: uuid.UUID) -> bool:
        """Delete file from storage."""
        pass
    
    @abstractmethod
    async def get_presigned_url(self, file_id: uuid.UUID, expires_in: int = 3600) -> str:
        """Get a presigned URL for direct file access."""
        pass


class LocalFileStorageService(FileStorageService):
    """Local file storage implementation for development."""
    
    def __init__(self, storage_dir: str = "/tmp/e_business_files"):
        self.storage_dir = storage_dir
        import os
        os.makedirs(storage_dir, exist_ok=True)
    
    async def upload(self, file_id: uuid.UUID, content: bytes, content_type: str) -> str:
        """Upload file to local storage."""
        import os
        file_path = os.path.join(self.storage_dir, str(file_id))
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        return file_path
    
    async def download(self, file_id: uuid.UUID) -> Optional[bytes]:
        """Download file from local storage."""
        import os
        file_path = os.path.join(self.storage_dir, str(file_id))
        
        if not os.path.exists(file_path):
            return None
        
        with open(file_path, 'rb') as f:
            return f.read()
    
    async def delete(self, file_id: uuid.UUID) -> bool:
        """Delete file from local storage."""
        import os
        file_path = os.path.join(self.storage_dir, str(file_id))
        
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        
        return False
    
    async def get_presigned_url(self, file_id: uuid.UUID, expires_in: int = 3600) -> str:
        """For local storage, just return the file path."""
        import os
        return os.path.join(self.storage_dir, str(file_id))


class MinIOFileStorageService(FileStorageService):
    """MinIO/S3 file storage implementation for production."""
    
    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket_name: str = "e-business-assets",
        secure: bool = True
    ):
        self.endpoint = endpoint
        self.bucket_name = bucket_name
        self.secure = secure
        
        # TODO: Initialize MinIO client
        # self.client = Minio(
        #     endpoint,
        #     access_key=access_key,
        #     secret_key=secret_key,
        #     secure=secure
        # )
        
        # Ensure bucket exists
        # if not self.client.bucket_exists(bucket_name):
        #     self.client.make_bucket(bucket_name)
    
    async def upload(self, file_id: uuid.UUID, content: bytes, content_type: str) -> str:
        """Upload file to MinIO/S3."""
        object_name = str(file_id)
        
        # TODO: Implement MinIO upload
        # from io import BytesIO
        # self.client.put_object(
        #     self.bucket_name,
        #     object_name,
        #     BytesIO(content),
        #     len(content),
        #     content_type=content_type
        # )
        
        return f"s3://{self.bucket_name}/{object_name}"
    
    async def download(self, file_id: uuid.UUID) -> Optional[bytes]:
        """Download file from MinIO/S3."""
        object_name = str(file_id)
        
        # TODO: Implement MinIO download
        # try:
        #     response = self.client.get_object(self.bucket_name, object_name)
        #     return response.read()
        # except Exception:
        #     return None
        
        return None
    
    async def delete(self, file_id: uuid.UUID) -> bool:
        """Delete file from MinIO/S3."""
        object_name = str(file_id)
        
        # TODO: Implement MinIO delete
        # try:
        #     self.client.remove_object(self.bucket_name, object_name)
        #     return True
        # except Exception:
        #     return False
        
        return False
    
    async def get_presigned_url(self, file_id: uuid.UUID, expires_in: int = 3600) -> str:
        """Get presigned URL for direct file access."""
        object_name = str(file_id)
        
        # TODO: Implement MinIO presigned URL
        # from datetime import timedelta
        # return self.client.presigned_get_object(
        #     self.bucket_name,
        #     object_name,
        #     expires=timedelta(seconds=expires_in)
        # )
        
        return f"https://{self.endpoint}/{self.bucket_name}/{object_name}"


def get_file_storage_service() -> FileStorageService:
    """
    Factory function to get the appropriate file storage service.
    Returns LocalFileStorageService for development, MinIOFileStorageService for production.
    """
    import os
    
    env = os.getenv("ENVIRONMENT", "development")
    
    if env == "production":
        return MinIOFileStorageService(
            endpoint=os.getenv("MINIO_ENDPOINT", "localhost:9000"),
            access_key=os.getenv("MINIO_ACCESS_KEY", ""),
            secret_key=os.getenv("MINIO_SECRET_KEY", ""),
            bucket_name=os.getenv("MINIO_BUCKET", "e-business-assets"),
            secure=os.getenv("MINIO_SECURE", "true").lower() == "true"
        )
    else:
        return LocalFileStorageService()
