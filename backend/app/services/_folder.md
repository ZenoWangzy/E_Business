# Folder Map: Business Services

**[SCOPE]**:
This folder (`backend/app/services`) encapsulates the Business Logic of the application. It sits between the API layer and the Database/Storage layers.

**[MEMBERS]**:
- `audit.py`: **Audit Logging**. Records administrative actions and system events.
- `storage_service.py`: **File Management**. Metrics and management of stored assets (S3/MinIO).
- `billing_service.py`: **Billing & Credits**. Manages user quotas, credits, and Stripe integration.
- `image_service.py`: **Image Processing**. Visual content generation logic.
- `video_service.py`: **Video Processing**. Video content generation logic.
- `task_retry_service.py`: **Resilience**. Utilities for retrying failed background tasks.

**[CONSTRAINTS]**:
- **Framework Agnostic**: Code here should ideally not depend on HTTP constructs (Request, Response).
- **Transactional**: Operations changing multiple entities should manage their own transactions or rely on the caller's session.
