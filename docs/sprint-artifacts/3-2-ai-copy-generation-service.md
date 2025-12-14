# Story 3.2: AI Copy Generation Service

Status: ready-for-dev

## Story

As a **Developer**,
I want to **use an LLM to generate diverse marketing copy**,
so that **the output is high-quality and varied**.

## Acceptance Criteria

### 1. Data-Driven Prompt Construction
**Given** A generation request for a specific copy type (e.g., "SEO Titles")
**When** The backend processes the request
**Then** It should construct a prompt that includes:
  - The parsed product text (description, parameters) from Epic 1
  - The user's selected "Tone of Voice" (if provided)
  - Specific instructions for the output format (e.g., "5 catchy titles under 60 chars")

### 2. LLM Integration
**Given** The prompt is ready
**When** The service calls the LLM Provider (e.g., OpenAI/Anthropic via LangChain or direct API)
**Then** It should receive a valid text response
**And** It should handle API errors (rate limits, timeouts) gracefully

### 3. Structured Output
**Given** The LLM returns raw text
**When** The service processes the response
**Then** It should parse the output into a strictly structured JSON format
**And** Return a list of strings (e.g., `["Title 1", "Title 2", ...]`) to the frontend

## Tasks / Subtasks

- [ ] **Backend: Dependencies & Config**
  - [ ] Add LLM library dependencies (e.g., `openai`, `langchain` if using, or just `httpx` for direct calls - Keep it simple as per Architecture). *Recommendation: Use `openai` python sdk or `langchain-core`.*
  - [ ] Update `.env` and `config.py` to include `OPENAI_API_KEY` (or equivalent).

- [ ] **Backend: Copy Service Logic**
  - [ ] Create `backend/app/services/copy_service.py`.
  - [ ] Implement `generate_copy(product_data: str, copy_type: str, tone: str) -> List[str]`.
  - [ ] Create prompt templates for: Titles, Selling Points, FAQ.

- [ ] **Backend: API Endpoint**
  - [ ] Create `backend/app/schemas/copy.py`:
    - `CopyGenerationRequest` (product_id, type, tone)
    - `CopyGenerationResponse` (items: List[str])
  - [ ] Create `backend/app/api/v1/endpoints/copy.py`.
  - [ ] Implement `POST /copy/generate` endpoint.
    - Fetch product data from DB using `product_id`.
    - Call `copy_service.generate_copy`.
    - Return result.

- [ ] **Testing**
  - [ ] Create unit tests for `copy_service.py` (Mock the LLM call!).
  - [ ] Create integration test for the API endpoint.

## Dev Notes

### Architecture Patterns
- **Service Layer**: Keep the prompt logic and LLM interaction in `services/copy_service.py`, not in the API route.
- **Sync vs Async**: Text generation is relatively fast (seconds), but can still block.
  - *Decision*: For MVP, a standard `async def` route calling an async LLM client is acceptable. No need for Celery unless generation takes >30s (e.g., fine-tuned models).
- **Security**: Never log the full API Key.

### Technical Specifics
- **Prompt Engineering**: Use "System" messages to set the behavior (Marketing Expert). Use "User" messages for the product data.
- **JSON Mode**: If using OpenAI latest models, enable `response_format={"type": "json_object"}` to guarantee valid JSON output, or better yet, use Function Calling / Tools to extract structured data reliably.

### Dependencies
- **Product Data**: Needs `Product` model/table to exist (from Epic 1) to fetch context.

## References
- [Epic 3 Definition](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#epic-3-content-power---ai-copywriting-studio)
- [Architecture Module Mapping](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#module-1-smart-copy-text)

## Dev Agent Record

### Context Reference
- **Story ID**: 3.2
- **Epic**: 3 (Content Power)

### Agent Model Used
- Antigravity (Google Deepmind)
