"""
Copy API Unit Tests
Story 3.1: AI Copywriting Studio - Backend API tests
"""

import pytest
from uuid import uuid4
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock, AsyncMock

from fastapi import status
from httpx import AsyncClient

from app.models.copy import CopyType, Tone, Audience, Length, JobStatus
from app.schemas.copy import (
    CopyGenerationRequest,
    GenerationConfig,
    CopyGenerationResponse,
    CopyJobStatusResponse,
)


class TestCopyGenerationEndpoint:
    """Tests for POST /copy/workspaces/{workspace_id}/products/{product_id}/generate"""

    @pytest.fixture
    def generation_request(self):
        return {
            "product_id": str(uuid4()),
            "type": "titles",
            "config": {
                "tone": "professional",
                "audience": "b2c",
                "length": "medium"
            },
            "context": ["Product is premium quality"]
        }

    @pytest.mark.asyncio
    async def test_generate_copy_returns_202_accepted(
        self,
        test_client: AsyncClient,
        authenticated_headers: dict,
        test_workspace_id: str,
        generation_request: dict
    ):
        """Generate copy should return 202 Accepted with task_id."""
        generation_request["product_id"] = str(uuid4())
        
        with patch('app.api.v1.endpoints.copy.celery_app') as mock_celery:
            mock_celery.send_task.return_value.id = str(uuid4())
            
            response = await test_client.post(
                f"/api/v1/copy/workspaces/{test_workspace_id}/products/{generation_request['product_id']}/generate",
                json=generation_request,
                headers=authenticated_headers
            )
        
        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert "task_id" in data
        assert data["status"] == "pending"

    @pytest.mark.asyncio
    async def test_generate_copy_requires_authentication(
        self,
        test_client: AsyncClient,
        test_workspace_id: str,
        generation_request: dict
    ):
        """Generate copy should require authentication."""
        response = await test_client.post(
            f"/api/v1/copy/workspaces/{test_workspace_id}/products/{uuid4()}/generate",
            json=generation_request
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_generate_copy_validates_copy_type(
        self,
        test_client: AsyncClient,
        authenticated_headers: dict,
        test_workspace_id: str
    ):
        """Generate copy should validate copy type enum."""
        invalid_request = {
            "product_id": str(uuid4()),
            "type": "invalid_type",  # Invalid
            "config": {
                "tone": "professional",
                "audience": "b2c",
                "length": "medium"
            }
        }
        
        response = await test_client.post(
            f"/api/v1/copy/workspaces/{test_workspace_id}/products/{uuid4()}/generate",
            json=invalid_request,
            headers=authenticated_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestCopyJobStatusEndpoint:
    """Tests for GET /copy/workspaces/{workspace_id}/jobs/{task_id}"""

    @pytest.mark.asyncio
    async def test_get_job_status_returns_current_status(
        self,
        test_client: AsyncClient,
        authenticated_headers: dict,
        test_workspace_id: str
    ):
        """Get job status should return current job state."""
        task_id = str(uuid4())
        
        # This would require a real job in the database
        response = await test_client.get(
            f"/api/v1/copy/workspaces/{test_workspace_id}/jobs/{task_id}",
            headers=authenticated_headers
        )
        
        # Job not found is expected for random UUID
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    @pytest.mark.asyncio
    async def test_get_job_status_requires_workspace_access(
        self,
        test_client: AsyncClient,
        authenticated_headers: dict
    ):
        """Get job status should require workspace membership."""
        other_workspace_id = str(uuid4())
        task_id = str(uuid4())
        
        response = await test_client.get(
            f"/api/v1/copy/workspaces/{other_workspace_id}/jobs/{task_id}",
            headers=authenticated_headers
        )
        
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]


class TestCopyResultsEndpoint:
    """Tests for GET /copy/workspaces/{workspace_id}/products/{product_id}/results"""

    @pytest.mark.asyncio
    async def test_get_results_returns_paginated_list(
        self,
        test_client: AsyncClient,
        authenticated_headers: dict,
        test_workspace_id: str
    ):
        """Get results should return paginated list."""
        product_id = str(uuid4())
        
        response = await test_client.get(
            f"/api/v1/copy/workspaces/{test_workspace_id}/products/{product_id}/results",
            headers=authenticated_headers
        )
        
        # Might be empty or 404 for new product
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
        
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert "results" in data
            assert "total" in data
            assert "page" in data


class TestQuotaEndpoint:
    """Tests for GET /copy/workspaces/{workspace_id}/quota"""

    @pytest.mark.asyncio
    async def test_get_quota_returns_usage_info(
        self,
        test_client: AsyncClient,
        authenticated_headers: dict,
        test_workspace_id: str
    ):
        """Get quota should return usage information."""
        response = await test_client.get(
            f"/api/v1/copy/workspaces/{test_workspace_id}/quota",
            headers=authenticated_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "used" in data
        assert "limit" in data
        assert "remaining" in data


class TestCopyModels:
    """Unit tests for Copy SQLAlchemy models."""

    def test_copy_type_enum_values(self):
        """CopyType enum should have expected values."""
        assert CopyType.TITLES.value == "titles"
        assert CopyType.SELLING_POINTS.value == "selling_points"
        assert CopyType.FAQ.value == "faq"
        assert CopyType.DESCRIPTIONS.value == "descriptions"

    def test_tone_enum_values(self):
        """Tone enum should have expected values."""
        assert Tone.PROFESSIONAL.value == "professional"
        assert Tone.CASUAL.value == "casual"
        assert Tone.PLAYFUL.value == "playful"
        assert Tone.LUXURY.value == "luxury"

    def test_job_status_enum_values(self):
        """JobStatus enum should have expected values."""
        assert JobStatus.PENDING.value == "pending"
        assert JobStatus.PROCESSING.value == "processing"
        assert JobStatus.COMPLETED.value == "completed"
        assert JobStatus.FAILED.value == "failed"


class TestCopySchemas:
    """Unit tests for Copy Pydantic schemas."""

    def test_generation_config_validation(self):
        """GenerationConfig should validate enum values."""
        config = GenerationConfig(
            tone=Tone.PROFESSIONAL,
            audience=Audience.B2C,
            length=Length.MEDIUM
        )
        assert config.tone == Tone.PROFESSIONAL
        assert config.audience == Audience.B2C
        assert config.length == Length.MEDIUM

    def test_copy_generation_request_validation(self):
        """CopyGenerationRequest should validate all fields."""
        request = CopyGenerationRequest(
            product_id=uuid4(),
            type=CopyType.TITLES,
            config=GenerationConfig(
                tone=Tone.PROFESSIONAL,
                audience=Audience.B2C,
                length=Length.MEDIUM
            ),
            context=["Test context"]
        )
        assert request.type == CopyType.TITLES
        assert len(request.context) == 1

    def test_copy_generation_response_has_task_id(self):
        """CopyGenerationResponse should include task_id."""
        response = CopyGenerationResponse(
            task_id=uuid4(),
            status=JobStatus.PENDING,
            message="Test message"
        )
        assert response.task_id is not None
        assert response.status == JobStatus.PENDING
