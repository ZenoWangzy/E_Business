# Folder Map: Data Schemas

**[SCOPE]**:
This folder (`backend/app/schemas`) contains Pydantic models used for Data Transfer Objects (DTOs), Input Validation, and API Responses.

**[MEMBERS]**:
- `admin_users.py`: **Admin**. Schemas for admin user management.
- `asset.py`: **Resources**. File metadata, upload/download responses.
- `audit.py`: **Compliance**. Audit log responses.
- `billing.py`: **Finance**. Subscription plans, invoices, usage stats.
- `product.py`: **E-commerce**. Product catalog data.
- `workspace.py`: **Tenancy**. Workspace creation, updates, membership.
- `storage.py`: **Infrastructure**. Storage usage stats.
- `video.py`, `image.py`: **Content**. Media generation parameters and results.

**[CONSTRAINTS]**:
- **Validation**: Use Pydantic `Field` for strict validation (min_length, regex).
- **Separation**: Keep `Create`, `Update`, and `Response` schemas distinct (e.g., `UserCreate`, `UserUpdate`, `User`).
- **ORM Mode**: Enable `from_attributes = True` (ConfigDict) for easy SQLAlchemy conversion.
