"""
Unit tests for Copy Generation Service.
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.copy_service import CopyGenerationService, CopyGenerationError
from app.models.copy import CopyType, Tone, Audience, Length
from app.models.asset import Asset
from app.models.product import Product, ProductCategory


class TestCopyGenerationService:
    """Test cases for CopyGenerationService."""

    @pytest.fixture
    async def mock_db(self):
        """Create a mock database session."""
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    async def copy_service(self, mock_db):
        """Create CopyGenerationService instance with mocked dependencies."""
        service = CopyGenerationService(mock_db)

        # Mock template environment
        service.template_env = MagicMock()

        return service

    @pytest.fixture
    def sample_asset(self):
        """Create a sample asset for testing."""
        return Asset(
            id=uuid.uuid4(),
            workspace_id=uuid.uuid4(),
            name="test_product.jpg",
            mime_type="image/jpeg",
            size=1024000,
            content="A premium quality product designed for professionals",
            preview="High-end product with advanced features"
        )

    @pytest.fixture
    def sample_product(self, sample_asset):
        """Create a sample product for testing."""
        return Product(
            id=uuid.uuid4(),
            workspace_id=sample_asset.workspace_id,
            name="Professional Widget Pro",
            category=ProductCategory.ELECTRONICS,
            original_asset_id=sample_asset.id
        )

    @pytest.mark.asyncio
    async def test_aggregate_product_context_success(
        self,
        copy_service,
        mock_db,
        sample_asset,
        sample_product
    ):
        """Test successful product context aggregation."""
        # Arrange
        asset_id = sample_asset.id
        workspace_id = sample_asset.workspace_id
        copy_type = CopyType.TITLES

        # Mock database queries
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_asset
        mock_db.execute.return_value.scalars.return_value.first.return_value = sample_product

        with patch('app.services.copy_service.select') as mock_select:
            # Setup mock queries
            mock_query = AsyncMock()
            mock_query.where.return_value = mock_query
            mock_select.return_value = mock_query

            # First query returns asset
            mock_result = AsyncMock()
            mock_result.scalar_one_or_none.return_value = sample_asset
            # Second query returns product
            mock_result2 = AsyncMock()
            mock_result2.scalar_one_or_none.return_value = sample_product

            mock_db.execute.side_effect = [mock_result, mock_result2]

            # Act
            context = await copy_service.aggregate_product_context(
                asset_id,
                copy_type,
                workspace_id
            )

            # Assert
            assert context["asset"]["id"] == str(asset_id)
            assert context["asset"]["name"] == "test_product.jpg"
            assert context["asset"]["content"] == "A premium quality product designed for professionals"
            assert context["product"]["name"] == "Professional Widget Pro"
            assert context["product"]["category"] == "electronics"
            assert context["category"] == "electronics"

    @pytest.mark.asyncio
    async def test_aggregate_product_context_asset_not_found(self, copy_service, mock_db):
        """Test context aggregation when asset is not found."""
        # Arrange
        asset_id = uuid.uuid4()
        workspace_id = uuid.uuid4()
        copy_type = CopyType.TITLES

        with patch('app.services.copy_service.select') as mock_select:
            mock_query = AsyncMock()
            mock_query.where.return_value = mock_query
            mock_select.return_value = mock_query

            mock_result = AsyncMock()
            mock_result.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_result

            # Act & Assert
            with pytest.raises(CopyGenerationError, match="Asset .* not found in workspace"):
                await copy_service.aggregate_product_context(
                    asset_id,
                    copy_type,
                    workspace_id
                )

    @pytest.mark.asyncio
    async def test_build_prompt_with_template(
        self,
        copy_service,
        sample_asset,
        sample_product
    ):
        """Test prompt building with Jinja2 template."""
        # Arrange
        context = {
            "asset": {
                "id": str(sample_asset.id),
                "name": sample_asset.name,
                "content": sample_asset.content
            },
            "product": {
                "id": str(sample_product.id),
                "name": sample_product.name,
                "category": sample_product.category.value
            },
            "category": sample_product.category.value
        }

        copy_type = CopyType.TITLES
        tone = Tone.PROFESSIONAL
        audience = Audience.B2B
        length = Length.MEDIUM

        # Mock template
        mock_template = MagicMock()
        mock_template.render.return_value = "Generated prompt content"
        copy_service.template_env.get_template.return_value = mock_template

        # Act
        prompt = await copy_service.build_prompt(
            context,
            copy_type,
            tone,
            audience,
            length
        )

        # Assert
        assert prompt == "Generated prompt content"
        copy_service.template_env.get_template.assert_called_once_with("titles.jinja2")

        # Verify template context
        expected_context = {
            "product": context["product"],
            "asset": context["asset"],
            "category": context["category"],
            "tone": "professional",
            "audience": "b2b",
            "length": "medium",
            "guidelines": copy_service._get_copy_guidelines(copy_type, tone, audience, length)
        }
        mock_template.render.assert_called_once_with(expected_context)

    @pytest.mark.asyncio
    async def test_build_prompt_fallback_no_template(self, copy_service, sample_asset):
        """Test prompt building fallback when template is not available."""
        # Arrange
        context = {
            "asset": {
                "name": sample_asset.name,
                "content": sample_asset.content
            },
            "product": None,
            "category": None
        }

        copy_type = CopyType.DESCRIPTIONS
        tone = Tone.CASUAL
        audience = Audience.B2C
        length = Length.SHORT

        # Mock template not found
        copy_service.template_env = None

        # Act
        prompt = await copy_service.build_prompt(
            context,
            copy_type,
            tone,
            audience,
            length
        )

        # Assert
        assert "Generate short descriptions for a product" in prompt
        assert "Tone: casual" in prompt
        assert "Audience: b2c" in prompt
        assert "A premium quality product designed for professionals" in prompt

    @pytest.mark.asyncio
    @patch('app.services.copy_service.openai.AsyncOpenAI')
    async def test_generate_with_llm_real_mode(self, mock_openai, copy_service):
        """Test LLM generation in real mode."""
        # Arrange
        prompt = "Generate product titles"
        max_tokens = 1000
        temperature = 0.7

        # Mock settings
        with patch('app.services.copy_service.settings') as mock_settings:
            mock_settings.ai_mock_mode = False
            mock_settings.openai_api_key = "test-key"
            mock_settings.openai_model = "gpt-4"
            mock_settings.copy_max_tokens = 2000
            mock_settings.copy_temperature = 0.7
            mock_settings.copy_retry_attempts = 3

            # Mock OpenAI response
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = "Generated title 1\nGenerated title 2"
            mock_client.chat.completions.create.return_value = mock_response
            mock_openai.return_value = mock_client

            # Act
            result = await copy_service.generate_with_llm(
                prompt,
                max_tokens,
                temperature
            )

            # Assert
            assert result == "Generated title 1\nGenerated title 2"
            mock_client.chat.completions.create.assert_called_once_with(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional copywriter specializing in e-commerce content. Generate compelling, persuasive copy that drives conversions."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=max_tokens,
                temperature=temperature,
                n=1
            )

    @pytest.mark.asyncio
    async def test_generate_with_llm_mock_mode(self, copy_service):
        """Test LLM generation in mock mode."""
        # Arrange
        prompt = "Generate titles for product"
        max_tokens = 1000
        temperature = 0.7

        # Mock settings
        with patch('app.services.copy_service.settings') as mock_settings:
            mock_settings.ai_mock_mode = True

            # Act
            result = await copy_service.generate_with_llm(
                prompt,
                max_tokens,
                temperature
            )

            # Assert
            assert result in [
                "Premium Quality Product - Unmatched Excellence",
                "Revolutionary Solution for Modern Needs",
                "Professional Grade - Trusted by Experts",
                "Innovative Design - Superior Performance",
                "Market Leader - Proven Results"
            ]

    def test_parse_generated_copy_numbered_list(self, copy_service):
        """Test parsing generated copy with numbered list format."""
        # Arrange
        generated_text = """1. Premium Quality Widget
Enhance your productivity with our professional-grade widget.

2. Advanced Design Solution
Revolutionary features for modern businesses.

3. Cost-Effective Choice
Save money without compromising quality."""

        copy_type = CopyType.TITLES
        job = MagicMock()

        # Act
        results = copy_service._parse_generated_copy(generated_text, copy_type, job)

        # Assert
        assert len(results) == 3
        assert "Premium Quality Widget" in results[0]
        assert "Advanced Design Solution" in results[1]
        assert "Cost-Effective Choice" in results[2]

    def test_parse_generated_copy_bullet_points(self, copy_service):
        """Test parsing generated copy with bullet points format."""
        # Arrange
        generated_text = """• High-quality materials
• Durable construction
• Affordable pricing
• Easy to use"""

        copy_type = CopyType.SELLING_POINTS
        job = MagicMock()

        # Act
        results = copy_service._parse_generated_copy(generated_text, copy_type, job)

        # Assert
        assert len(results) == 4
        assert "High-quality materials" in results
        assert "Durable construction" in results
        assert "Affordable pricing" in results
        assert "Easy to use" in results

    def test_parse_generated_copy_paragraphs(self, copy_service):
        """Test parsing generated copy with paragraphs."""
        # Arrange
        generated_text = """This is a compelling product description that highlights the key features and benefits.

Our product offers exceptional value for money. It's designed with the user in mind and provides reliable performance day after day.

Don't miss out on this opportunity to upgrade your workflow."""

        copy_type = CopyType.DESCRIPTIONS
        job = MagicMock()

        # Act
        results = copy_service._parse_generated_copy(generated_text, copy_type, job)

        # Assert
        assert len(results) == 3
        assert "compelling product description" in results[0]
        assert "exceptional value for money" in results[1]
        assert "opportunity to upgrade" in results[2]

    def test_get_copy_guidelines(self, copy_service):
        """Test copy guidelines generation."""
        # Arrange
        copy_type = CopyType.TITLES
        tone = Tone.PROFESSIONAL
        audience = Audience.B2B
        length = Length.SHORT

        # Act
        guidelines = copy_service._get_copy_guidelines(copy_type, tone, audience, length)

        # Assert
        assert "tone" in guidelines
        assert "audience" in guidelines
        assert "length" in guidelines
        assert "formal language" in guidelines["tone"]
        assert "business value" in guidelines["audience"]
        assert "under 50 words" in guidelines["length"]