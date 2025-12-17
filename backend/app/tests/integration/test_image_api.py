"""
Integration Tests for Image Generation API.
Story 2.1: Style Selection & Generation Trigger

Simplified tests that don't require full database setup.
Tests API schema validation and enum configurations.
"""
import pytest
import uuid

from app.models.image import StyleType, JobStatus
from app.schemas.image import ImageGenerationRequest, ImageGenerationResponse, JobStatusResponse


class TestImageGenerationSchemas:
    """Test suite for Image Generation API schemas."""

    def test_image_generation_request_valid(self):
        """Test valid generation request."""
        request = ImageGenerationRequest(
            style_id=StyleType.MODERN,
            category_id="clothing",
            asset_id=uuid.uuid4(),
            product_id=uuid.uuid4()
        )
        assert request.style_id == StyleType.MODERN
        assert request.category_id == "clothing"

    def test_image_generation_request_all_styles(self):
        """Test all 6 styles are valid in request."""
        for style in StyleType:
            request = ImageGenerationRequest(
                style_id=style,
                category_id="test",
                asset_id=uuid.uuid4(),
                product_id=uuid.uuid4()
            )
            assert request.style_id == style

    def test_image_generation_response_structure(self):
        """Test response schema structure."""
        response = ImageGenerationResponse(
            task_id=uuid.uuid4(),
            status=JobStatus.PENDING,
            message="Test message"
        )
        assert response.status == JobStatus.PENDING
        assert response.message == "Test message"

    def test_job_status_response_structure(self):
        """Test job status response schema."""
        from datetime import datetime
        
        response = JobStatusResponse(
            task_id=uuid.uuid4(),
            status=JobStatus.COMPLETED,
            progress=100,
            result_urls=["http://example.com/image1.png"],
            created_at=datetime.utcnow()
        )
        assert response.status == JobStatus.COMPLETED
        assert response.progress == 100
        assert len(response.result_urls) == 1


class TestStyleTypeValidation:
    """Test that all required styles are supported."""

    def test_all_styles_accepted(self):
        """Verify all 6 styles from AC are valid enum values."""
        required_styles = ["modern", "luxury", "fresh", "tech", "warm", "business"]
        for style in required_styles:
            assert StyleType(style) is not None

    def test_style_count(self):
        """Verify exactly 6 styles exist."""
        assert len(StyleType) == 6

    def test_invalid_style_raises(self):
        """Test invalid style raises ValueError."""
        with pytest.raises(ValueError):
            StyleType("invalid_style")


class TestJobStatusValidation:
    """Test job status enum values."""

    def test_all_statuses_exist(self):
        """Verify all job statuses exist."""
        assert JobStatus.PENDING.value == "pending"
        assert JobStatus.PROCESSING.value == "processing"
        assert JobStatus.COMPLETED.value == "completed"
        assert JobStatus.FAILED.value == "failed"

    def test_status_count(self):
        """Test exactly 4 statuses exist."""
        assert len(JobStatus) == 4
