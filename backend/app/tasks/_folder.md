# Folder Map: Async Tasks (Celery)

**[SCOPE]**:
This folder (`backend/app/tasks`) contains asynchronous background jobs executing via Celery workers.

**[MEMBERS]**:
- `billing.py`: **Finance**. Monthly quota resets, invoice generation.
- `copy_tasks.py`: **AI Text**. Async copywriting generation.
- `image_generation.py`: **AI Image**. Async image generation calling external APIs.
- `video_tasks.py`: **AI Video**. Long-running video rendering and script generation.
- `invite_cleanup.py`: **Maintenance**. Expiring old invitations.
- `storage_cleanup.py`: **Storage**. Reconciling pending uploads and cleaning up failed asset records. Uses TransactionalUploadService.
- `stats_precomputation.py`: **Analytics**. Aggregating data for admin dashboards.

**[CONSTRAINTS]**:
- **Idempotency**: Tasks should be safe to retry multiple times.
- **Serialization**: Arguments must be JSON-serializable (pass IDs, not Objects).
- **Error Handling**: Must catch exceptions and update Job status (e.g. to FAILED).
