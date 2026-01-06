"""
[IDENTITY]: Application Entry Point
Initializes the FastAPI application, configures middleware (CORS), and mounts all API routers.

[INPUT]: None (Entry script)
[LINK]:
  - Settings -> ./core/config.py
  - Exceptions -> ./core/exceptions.py
  - ErrorHandler -> ./api/middleware/error_handler.py
  - AuthRouter -> ./api/v1/endpoints/auth.py
  - WorkspaceRouter -> ./api/v1/endpoints/workspaces.py
  - AssetsRouter -> ./api/v1/endpoints/assets.py
  - ImageRouter -> ./api/v1/endpoints/image.py
  - StreamRouter -> ./api/v1/endpoints/image_stream.py
  - ProductRouter -> ./api/v1/endpoints/products.py
  - StorageRouter -> ./api/v1/endpoints/storage.py
  - CopyRouter -> ./api/v1/endpoints/copy.py
  - VideoRouter -> ./api/v1/endpoints/video.py
  - BillingRouter -> ./api/v1/endpoints/billing.py
  - AdminRouter -> ./api/v1/endpoints/admin.py
  - CSRFRouter -> ./api/v1/endpoints/csrf.py

[OUTPUT]: FastAPI Application Instance
[POS]: /backend/app/main.py (Root)

[PROTOCOL]:
1. Any change to middleware config requires reviewing `frontend/src/middleware.ts` for consistency.
2. New routers must be added to `[LINK]` and mounted in `app.include_router`.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.exceptions import EBusinessException
from app.api.middleware.error_handler import ebusiness_exception_handler
from app.api.middleware.request_id import RequestIDMiddleware
from app.api.v1.endpoints import auth as auth_router
from app.api.v1.endpoints import workspaces as workspaces_router
from app.api.v1.endpoints import assets as assets_router
from app.api.v1.endpoints import image as image_router
from app.api.v1.endpoints import image_stream as image_stream_router
from app.api.v1.endpoints import products as products_router
from app.api.v1.endpoints import storage as storage_router
from app.api.v1.endpoints import copy as copy_router
from app.api.v1.endpoints import video as video_router
from app.api.v1.endpoints import billing as billing_router
from app.api.v1.endpoints import admin as admin_router
from app.api.v1.endpoints import csrf as csrf_router

settings = get_settings()

app = FastAPI(
    title="E_Business API",
    description="AI-powered e-commerce content generation platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # Explicit methods
    allow_headers=["Content-Type", "Authorization", "Cookie"],  # Required headers
    expose_headers=["Set-Cookie", "X-Request-ID"],  # Allow frontend to read Set-Cookie and Request ID
)

# Request ID middleware for observability
app.add_middleware(RequestIDMiddleware)

# Exception handlers
app.add_exception_handler(EBusinessException, ebusiness_exception_handler)

# 通用异常处理器 - 捕获所有未处理的异常
from app.api.middleware.error_handler import generic_exception_handler
app.add_exception_handler(Exception, generic_exception_handler)

# API routes
app.include_router(auth_router.router, prefix=settings.api_v1_prefix)
app.include_router(workspaces_router.router, prefix=settings.api_v1_prefix)
app.include_router(assets_router.router, prefix=settings.api_v1_prefix)
app.include_router(image_router.router, prefix=settings.api_v1_prefix)
app.include_router(image_stream_router.router, prefix=f"{settings.api_v1_prefix}/images")
app.include_router(products_router.router, prefix=settings.api_v1_prefix)
app.include_router(storage_router.router, prefix=settings.api_v1_prefix)
app.include_router(copy_router.router, prefix=settings.api_v1_prefix)
app.include_router(video_router.router, prefix=settings.api_v1_prefix)
app.include_router(billing_router.router, prefix=settings.api_v1_prefix)
app.include_router(admin_router.router, prefix=settings.api_v1_prefix)
app.include_router(csrf_router.router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "E_Business API is running", "docs": "/docs"}

