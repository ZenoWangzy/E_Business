"""
[IDENTITY]: Copy Generation Service
Core Business Logic for Text Generation (LLM Wrapper).

[INPUT]:
- Prompt Context (Product, Asset, Tone, etc).

[LINK]:
- LLM_Client -> OpenAI (Async)
- Template -> app/templates/copy/*.jinja2

[OUTPUT]: Generated Text or List[String].
[POS]: /backend/app/services/copy_service.py

[PROTOCOL]:
1. Supports `AI_MOCK_MODE` for cost-free testing.
2. Aggregates context from `Asset` and `Product` before building prompt.
"""

import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

import redis
import openai
from tenacity import retry, stop_after_attempt, wait_exponential
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jinja2 import Environment, FileSystemLoader

from app.core.config import get_settings
from app.core.logger import get_logger, log_task_event
from app.models.copy import (
    CopyGenerationJob,
    CopyResult,
    JobStatus,
    CopyType,
    Tone,
    Audience,
    Length
)
from app.models.product import Product
from app.models.asset import Asset

settings = get_settings()
logger = get_logger(__name__)

# Redis client for publishing status updates
redis_client = redis.from_url(settings.redis_url)


class CopyGenerationError(Exception):
    """Custom exception for copy generation errors."""
    pass


class CopyGenerationService:
    """Service for handling AI copywriting generation."""

    def __init__(self, db: AsyncSession):
        """Initialize the service with database session."""
        self.db = db
        self._setup_template_manager()

    def _setup_template_manager(self) -> None:
        """Setup the Jinja2 template environment."""
        try:
            template_dir = "app/templates/copy"
            self.template_env = Environment(
                loader=FileSystemLoader(template_dir),
                autoescape=False
            )
        except Exception as e:
            logger.warning(f"Failed to load templates from {template_dir}: {e}")
            self.template_env = None

    async def aggregate_product_context(
        self,
        asset_id: uuid.UUID,
        copy_type: CopyType,
        workspace_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Aggregate product information and asset content for context.

        Args:
            asset_id: The asset ID to aggregate content from
            copy_type: Type of copy being generated
            workspace_id: Current workspace for multi-tenant isolation

        Returns:
            Dictionary containing product context and asset content
        """
        # Query asset with workspace isolation
        asset_query = select(Asset).where(
            Asset.id == asset_id,
            Asset.workspace_id == workspace_id
        )
        asset_result = await self.db.execute(asset_query)
        asset = asset_result.scalar_one_or_none()

        if not asset:
            raise CopyGenerationError(f"Asset {asset_id} not found in workspace {workspace_id}")

        # Query product associated with the asset
        product_query = select(Product).where(
            Product.original_asset_id == asset_id,
            Product.workspace_id == workspace_id
        )
        product_result = await self.db.execute(product_query)
        product = product_result.scalar_one_or_none()

        context = {
            "asset": {
                "id": str(asset.id),
                "name": asset.name,
                "mime_type": asset.mime_type,
                "size": asset.size,
                "content": asset.content or "",
                "preview": asset.preview or ""
            },
            "product": None,
            "category": None
        }

        if product:
            context["product"] = {
                "id": str(product.id),
                "name": product.name,
                "category": product.category.value,
                "status": product.status.value
            }
            context["category"] = product.category.value

        return context

    async def build_prompt(
        self,
        context: Dict[str, Any],
        copy_type: CopyType,
        tone: Tone,
        audience: Audience,
        length: Length
    ) -> str:
        """
        Build prompt based on template and context.

        Args:
            context: Product and asset context
            copy_type: Type of copy to generate
            tone: Desired tone of the copy
            audience: Target audience
            length: Desired length of the copy

        Returns:
            Complete prompt for LLM generation
        """
        if not self.template_env:
            # Fallback to simple prompt if templates not available
            return self._build_fallback_prompt(context, copy_type, tone, audience, length)

        template_name = f"{copy_type.value}.jinja2"

        try:
            template = self.template_env.get_template(template_name)
        except Exception as e:
            logger.warning(f"Template {template_name} not found: {e}")
            return self._build_fallback_prompt(context, copy_type, tone, audience, length)

        # Prepare template context
        template_context = {
            "product": context.get("product", {}),
            "asset": context.get("asset", {}),
            "category": context.get("category"),
            "tone": tone.value,
            "audience": audience.value,
            "length": length.value,
            "guidelines": self._get_copy_guidelines(copy_type, tone, audience, length)
        }

        return template.render(template_context)

    def _build_fallback_prompt(
        self,
        context: Dict[str, Any],
        copy_type: CopyType,
        tone: Tone,
        audience: Audience,
        length: Length
    ) -> str:
        """
        Build a fallback prompt when templates are not available.
        """
        product = context.get("product", {})
        asset = context.get("asset", {})
        category = context.get("category", "product")

        prompt_parts = [
            f"Generate {length.value} {copy_type.value} for a {category}.",
            f"Tone: {tone.value}",
            f"Audience: {audience.value}",
            ""
        ]

        if product:
            prompt_parts.append(f"Product Name: {product.get('name', 'N/A')}")
            prompt_parts.append(f"Product Category: {category}")

        if asset.get("content"):
            prompt_parts.append(f"Product Description: {asset['content'][:500]}")
        elif asset.get("preview"):
            prompt_parts.append(f"Product Details: {asset['preview'][:300]}")

        prompt_parts.extend([
            "",
            f"Generate 3-5 compelling {copy_type.value} options.",
            "Make them engaging, persuasive, and tailored to the specified tone and audience.",
            "Format as a numbered list."
        ])

        return "\n".join(prompt_parts)

    def _get_copy_guidelines(
        self,
        copy_type: CopyType,
        tone: Tone,
        audience: Audience,
        length: Length
    ) -> Dict[str, str]:
        """
        Get specific guidelines for different copy types.
        """
        guidelines = {
            "tone_instructions": {
                Tone.PROFESSIONAL: "Use formal language, industry terminology, and authoritative tone",
                Tone.CASUAL: "Use conversational language, relatable examples, and friendly tone",
                Tone.PLAYFUL: "Use humor, creativity, and engaging wordplay",
                Tone.LUXURY: "Use sophisticated language, emphasize exclusivity and premium quality"
            },
            "audience_instructions": {
                Audience.B2B: "Focus on business value, ROI, efficiency, and professional benefits",
                Audience.B2C: "Focus on emotional appeal, lifestyle benefits, and personal value",
                Audience.TECHNICAL: "Include specifications, technical details, and performance metrics"
            },
            "length_instructions": {
                Length.SHORT: "Keep it concise - under 50 words per option",
                Length.MEDIUM: "Provide moderate detail - 50-150 words per option",
                Length.LONG: "Be comprehensive - 150-300 words per option"
            }
        }

        return {
            "tone": guidelines["tone_instructions"][tone],
            "audience": guidelines["audience_instructions"][audience],
            "length": guidelines["length_instructions"][length]
        }

    @retry(
        stop=stop_after_attempt(settings.copy_retry_attempts),
        wait=wait_exponential(
            multiplier=settings.copy_retry_base_delay,
            min=1,
            max=10
        )
    )
    async def generate_with_llm(
        self,
        prompt: str,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> str:
        """
        Generate copy using LLM (OpenAI GPT-4).

        Args:
            prompt: The prompt for generation
            max_tokens: Maximum tokens to generate
            temperature: Generation temperature (creativity)

        Returns:
            Generated copy text
        """
        max_tokens = max_tokens or settings.copy_max_tokens
        temperature = temperature or settings.copy_temperature

        if settings.ai_mock_mode:
            return await self._generate_mock_copy(prompt, max_tokens)

        # Real OpenAI generation
        try:
            client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

            response = await client.chat.completions.create(
                model=settings.openai_model,
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

            return response.choices[0].message.content or ""

        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise CopyGenerationError(f"Failed to generate copy: {str(e)}")

    async def _generate_mock_copy(self, prompt: str, max_tokens: int) -> str:
        """
        Generate mock copy for development/testing.
        """
        # Simulate processing delay
        await asyncio.sleep(1)

        # Extract copy type from prompt for more realistic mock responses
        copy_type = "copy"
        if "titles" in prompt.lower():
            copy_type = "titles"
            mock_responses = [
                "Premium Quality Product - Unmatched Excellence",
                "Revolutionary Solution for Modern Needs",
                "Professional Grade - Trusted by Experts",
                "Innovative Design - Superior Performance",
                "Market Leader - Proven Results"
            ]
        elif "selling points" in prompt.lower():
            copy_type = "selling points"
            mock_responses = [
                "• Premium materials ensure long-lasting durability\n• Expertly crafted for professional results\n• Backed by comprehensive warranty\n• Eco-friendly and sustainable design\n• Trusted by over 100,000 satisfied customers",
                "• Cutting-edge technology meets user-friendly design\n• Cost-effective solution for businesses\n• Reduces operational costs by 40%\n• Requires minimal maintenance\n• 24/7 customer support included"
            ]
        elif "faq" in prompt.lower():
            copy_type = "FAQ"
            mock_responses = [
                "Q: Is this product compatible with my existing setup?\nA: Yes, our product is designed for universal compatibility with all standard systems.\n\nQ: What warranty is included?\nA: We offer a comprehensive 2-year warranty covering all manufacturing defects.\n\nQ: How long does delivery take?\nA: Standard delivery is 3-5 business days, with express options available."
            ]
        else:
            copy_type = "descriptions"
            mock_responses = [
                "Discover the perfect blend of innovation and reliability with our premium product. Engineered to exceed expectations, this solution delivers exceptional performance in even the most demanding environments. Crafted from the finest materials and backed by our quality guarantee, it's the smart choice for discerning customers who accept nothing but the best."
            ]

        # Return a random response from the appropriate list
        import random
        return random.choice(mock_responses)

    async def process_generation(
        self,
        job_id: str,
        request_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process a copy generation request.

        Args:
            job_id: The generation job ID
            request_data: Generation request parameters

        Returns:
            Dict with generation results
        """
        log_task_event(
            logger,
            job_id,
            "started",
            f"Starting copy generation with params: {request_data}"
        )

        # Fetch the job
        job = await self.db.get(CopyGenerationJob, job_id)

        if not job:
            log_task_event(logger, job_id, "error", "Job not found")
            raise CopyGenerationError(f"Job {job_id} not found")

        try:
            # Update job status to processing
            job.status = JobStatus.PROCESSING
            job.started_at = datetime.now(timezone.utc)
            await self.db.commit()

            # Publish progress
            await self._publish_progress(str(job.task_id), 10, "Aggregating product content...")

            # Aggregate product context
            context = await self.aggregate_product_context(
                job.product_id,
                job.copy_type,
                job.workspace_id
            )

            # Publish progress
            await self._publish_progress(str(job.task_id), 30, "Building prompt...")

            # Build prompt
            prompt = await self.build_prompt(
                context,
                job.copy_type,
                job.tone,
                job.audience,
                job.length
            )

            # Publish progress
            await self._publish_progress(str(job.task_id), 50, "Generating copy...")

            # Generate copy
            generated_text = await self.generate_with_llm(
                prompt,
                max_tokens=settings.copy_max_tokens,
                temperature=settings.copy_temperature
            )

            # Parse and save results
            results = self._parse_generated_copy(
                generated_text,
                job.copy_type,
                job
            )

            # Publish progress
            await self._publish_progress(str(job.task_id), 90, "Saving results...")

            # Update job status
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc)
            job.raw_results = results
            job.progress = 100
            await self.db.commit()

            # Publish completion
            await self._publish_progress(
                str(job.task_id),
                100,
                f"Generated {len(results)} {job.copy_type.value} options"
            )

            log_task_event(
                logger,
                job_id,
                "completed",
                f"Generated {len(results)} {job.copy_type.value} options"
            )

            return {
                "status": "completed",
                "results": results,
                "job_id": job_id,
                "copy_type": job.copy_type.value
            }

        except Exception as e:
            # Handle error
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            await self.db.commit()

            # Publish failure
            await self._publish_progress(
                str(job.task_id),
                0,
                f"Failed: {str(e)}"
            )

            log_task_event(
                logger,
                job_id,
                "failed",
                f"Generation failed: {str(e)}"
            )
            raise CopyGenerationError(f"Generation failed: {str(e)}")

    def _parse_generated_copy(
        self,
        generated_text: str,
        copy_type: CopyType,
        job: CopyGenerationJob
    ) -> List[str]:
        """
        Parse generated copy into individual options.
        """
        # Split by numbered list or bullet points
        import re

        # Try to extract numbered list items
        numbered_items = re.findall(
            r'^\d+\.\s*(.+?)(?=\n\d+\.|\n*$)',
            generated_text,
            re.MULTILINE | re.DOTALL
        )

        if numbered_items:
            return [item.strip() for item in numbered_items if item.strip()]

        # Try bullet points
        bullet_items = re.findall(
            r'^[•\-\*]\s*(.+?)(?=\n[•\-\*]|\n*$)',
            generated_text,
            re.MULTILINE | re.DOTALL
        )

        if bullet_items:
            return [item.strip() for item in bullet_items if item.strip()]

        # Split by double newlines (paragraphs)
        paragraphs = [p.strip() for p in generated_text.split('\n\n') if p.strip()]

        # If we have multiple paragraphs, return them
        if len(paragraphs) > 1:
            return paragraphs

        # Return the entire text as a single option
        return [generated_text.strip()]

    async def _publish_progress(
        self,
        task_id: str,
        progress: int,
        message: str
    ) -> None:
        """
        Publish progress update to Redis.
        """
        channel = f"task_updates:{task_id}"
        payload = {
            "status": "processing" if progress < 100 else "completed",
            "progress": progress,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        try:
            redis_client.publish(channel, json.dumps(payload))
        except Exception as e:
            logger.warning(f"Failed to publish progress to Redis: {e}")

    async def save_copy_result(
        self,
        job_id: uuid.UUID,
        content: str,
        copy_type: CopyType,
        tone: Tone,
        audience: Audience,
        length: Length,
        workspace_id: uuid.UUID,
        product_id: uuid.UUID
    ) -> CopyResult:
        """
        Save a generated copy result to the database.
        """
        result = CopyResult(
            workspace_id=workspace_id,
            generation_job_id=job_id,
            product_id=product_id,
            content=content,
            copy_type=copy_type,
            generation_config={
                "tone": tone.value,
                "audience": audience.value,
                "length": length.value
            }
        )

        self.db.add(result)
        await self.db.commit()
        await self.db.refresh(result)

        return result