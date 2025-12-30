# Folder Map: Database Infrastructure

**[SCOPE]**:
This folder (`backend/app/db`) manages the low-level database connection, session handling, and ORM base classes.

**[MEMBERS]**:
- `session.py`: **Engine & Session**. Configures SQLAlchemy engine and session factory.
- `base.py`: **Model Registry**. Imports all models to resolve SQLAlchemy relationships.
- `base_class.py` (or inside base.py): **ORM Base**. The `Base` class for all models.
- `init_db.py` (if present): **Bootstrap**. Initial database seeding.

**[CONSTRAINTS]**:
- **No Business Logic**: This layer is purely for infrastructure.
- **Async**: Must use `AsyncSession` and `create_async_engine`.
