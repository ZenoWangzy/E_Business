# Folder Map: Data Models

**[SCOPE]**:
This folder (`backend/app/models`) contains the SQLAlchemy ORM models representing the database schema.

**[MEMBERS]**:
- `user.py`: **User & Auth**. Users, Roles, Permissions.
- `workspace.py`: **Tenancy**. Workspaces, Memberships, Invites.
- `asset.py`: **Resources**. Files, Images, Videos stored in the system.
- `audit.py`: **Compliance**. Audit logs for system actions.
- `product.py`: **E-commerce**. Products, Variants (if applicable).
- `system_log.py`: **Observability**. Async system logs.

**[CONSTRAINTS]**:
- **Pure Data**: Models should not contain business logic.
- **Relationships**: Define `relationship()` explicitly with `back_populates`.
- **Base**: All models must inherit from `app.db.base_class.Base`.
