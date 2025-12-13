---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - /Users/ZenoWang/Documents/project/E_Business/docs/prd.md
  - /Users/ZenoWang/Documents/project/E_Business/docs/architecture.md
  - /Users/ZenoWang/Documents/project/E_Business/docs/ux-design-specification.md
---

# E_Business - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for E_Business, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: 一个新用户可以注册一个账户。
FR2: 已有用户可以登录和登出。
FR3: 用户（商家老板）可以为其业务创建一个独立、隔离的工作空间（租户）。
FR4: 商家老板可以邀请其他用户（助理）加入其工作空间。
FR5: 助理可以接受邀请加入一个工作空间。
FR6: 用户可以上传一张主要的产品图片。
FR7: 用户可以上传补充文档（如PDF, Word, text）。
FR8: 系统可以从上传的文档中解析出文本内容。
FR9: 用户可以为他们的产品选择一个商品类别。
FR_COPY_01: 系统可以从上传的文档/图片中解析产品参数。
FR_COPY_02: 用户可以生成 5 个 SEO 友好的产品标题 (Titles)。
FR_COPY_03: 用户可以生成 3 种不同语气的卖点描述 (Selling Points)。
FR_COPY_04: 用户可以生成常见问答 (FAQ) 列表。
FR_COPY_05: 用户可以一键复制生成的文本到剪贴板。
FR_VIS_01: 用户可以上传主图并选择生成风格。
FR_VIS_02: 系统生成全套组图 (主图、细节图、场景图)。
FR_VIS_03: 用户可以对生成的图片进行简单的文字标注 (Annotation)。
FR_VIS_04: 用户可以上传参考图进行风格控制 (Image Reference)。
FR_VIS_05: 用户可以下载拼接好的详情长图。
FR_VID_01: 用户可以选择生成“创意广告视频”(Creative Ad) 或 “功能介绍视频”(Functional Intro)。
FR_VID_02: 系统可以为视频生成脚本和分镜（基于已解析的产品文档）。
FR_VID_03: 用户可以预览并简单的编辑生成的视频（如更换背景音乐）。
FR_VID_04: 系统支持生成 15-30秒 的短视频内容。
FR_VID_05: 系统支持生成带有 AI 配音 (TTS) 的解说词。
FR23: 系统可以根据用户的订阅等级，实施不同的功能限制（如生成配额）。
FR24: 用户可以查看他们当前的订阅计划和使用量。
FR25: 用户可以升级或更改他们的订阅计划。
FR26: 管理员用户可以查看平台使用统计数据（如新用户数、生成任务数）。
FR27: 管理员用户可以查看系统日志，包括失败的任务。
FR28: 管理员用户可以管理用户账户。
FR29: 管理员用户可以代表一个用户，手动重试一个失败的生成任务。

### NonFunctional Requirements

NFR1: Generation Speed - The average time to generate a single image must be under 30 seconds.
NFR2: UI Responsiveness - The user interface should remain responsive and not lock up during background processing.
NFR3: Data Protection - All user data must be encrypted both in transit (TLS) and at rest.
NFR4: Authentication - User authentication must be secure against common vulnerabilities.
NFR5: Web Security - Application must implement standard protections (OWASP Top 10, XSS, CSRF).
NFR6: MVP User Load - Support at least 100 concurrent users without degradation.
NFR7: Reliability - Designed for general stability and quick recovery from failures.

### Additional Requirements

From Architecture:
- [Technical] Frontend: Next.js 14+ (App Router), Tailwind CSS, available at http://localhost:3000
- [Technical] Backend: FastAPI (Python), available at http://localhost:8000
- [Technical] Database: PostgreSQL (Async) via SQLAlchemy
- [Technical] Async Tasks: Celery v5.6 + Redis for AI tasks (>30s)
- [Technical] Storage: MinIO (S3 Compatible) for file assets
- [Technical] Infrastructure: Docker Compose for local dev (PG, Redis, MinIO, Backend)
- [Api Consistency] Frontend uses camelCase, Backend uses snake_case (auto-conversion via Pydantic)
- [Api Consistency] Flat RESTful response format
- [Authentication] NextAuth.js v5 (Beta) with Google/GitHub OAuth providers
- [Streaming] Server-Sent Events (SSE) or WebSocket for real-time AI status updates

From UX Design:
- [UX Pattern] Triple-Sidebar Layout (Global Rail, Context Sidebar, Main Content)
- [UX Pattern] 4-Step "One-Click" Generation Wizard (Upload -> Category -> Style -> Editor)
- [UX Interaction] Drag & Drop file ingestion with client-side parsing (pdf.js/mammoth.js)
- [UX Visual] Shadcn/UI component library with Tailwind CSS v4
- [UX Feature] Canvas Stitching for extracting "Long Image" detail views
- [UX Feature] Video Studio with segmented control mode switching

### FR Coverage Map

FR1: Epic 1 - Account Creation
FR2: Epic 1 - Login/Logout
FR3: Epic 1 - Workspace Isolation
FR4: Epic 1 - Invite Users
FR5: Epic 1 - Accept Invite
FR6: Epic 1 - Asset Upload
FR7: Epic 1 - Doc Upload
FR8: Epic 1 - Text Parsing
FR9: Epic 1 - Category Selection
FR_COPY_01: Epic 3 - Content Parsing
FR_COPY_02: Epic 3 - Title Gen
FR_COPY_03: Epic 3 - Desc Gen
FR_COPY_04: Epic 3 - FAQ Gen
FR_COPY_05: Epic 3 - Copy to Clipboard
FR_VIS_01: Epic 2 - Style Selection
FR_VIS_02: Epic 2 - Image Gen
FR_VIS_03: Epic 2 - Annotation
FR_VIS_04: Epic 2 - Reference Image
FR_VIS_05: Epic 2 - Long Image Download
FR_VID_01: Epic 4 - Video Type
FR_VID_02: Epic 4 - Script Gen
FR_VID_03: Epic 4 - Preview/Edit
FR_VID_04: Epic 4 - Short Video
FR_VID_05: Epic 4 - TTS
FR23: Epic 5 - Quota Limits
FR24: Epic 5 - Usage View
FR25: Epic 5 - Upgrade Plan
FR26: Epic 5 - Admin Stats
FR27: Epic 5 - Admin Logs
FR28: Epic 5 - User Mgmt
FR29: Epic 5 - Retry Task

## Epic List

### Epic 1: The Foundation - Workspace & Content Ingestion
Establish the multi-tenant SaaS foundation and the ability to get content IN. Users can register, create a secure workspace, login, and upload product assets (images/docs) that are parsed and ready for use.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9

### Epic 2: The Core - AI Visual Asset Studio
Deliver the primary distinctive value: "One Click, One Store". Users can generate high-quality image sets from their uploads, edit/annotate them, and download the results.
**FRs covered:** FR_VIS_01, FR_VIS_02, FR_VIS_03, FR_VIS_04, FR_VIS_05

### Epic 3: Content Power - AI Copywriting Studio
Enable text generation capability. Users can generate SEO titles, descriptions, and FAQs derived from their uploaded documents.
**FRs covered:** FR_COPY_01, FR_COPY_02, FR_COPY_03, FR_COPY_04, FR_COPY_05

### Epic 4: Multimedia - AI Video Studio
Expand to video generation. Users can generate short creative or functional videos from their static assets.
**FRs covered:** FR_VID_01, FR_VID_02, FR_VID_03, FR_VID_04, FR_VID_05

### Epic 5: SaaS Maturity - Subscription & Admin
Enable business limits and management. Users can view quotas/upgrade. Admins can manage the platform.
**FRs covered:** FR23, FR24, FR25, FR26, FR27, FR28, FR29


## Epic 1: The Foundation - Workspace & Content Ingestion

Establish the multi-tenant SaaS foundation and the ability to get content IN. Users can register, create a secure workspace, login, and upload product assets (images/docs) that are parsed and ready for use.

### Story 1.1: Environment Initialization & DB Migration

As a Developer,
I want to initialize the local docker-compose environment and database migrations,
So that I have a working foundation for the application.

**Acceptance Criteria:**

**Given** the project repository is cloned
**When** I run `docker-compose up -d`
**Then** PostgreSQL, Redis, and MinIO containers should be running and healthy
**And** I can access the MinIO console at localhost:9001
**And** I can run `alembic upgrade head` to apply initial migrations (Users, Workspaces tables)
**And** The monorepo structure (frontend/backend) is created with basic boilerplate

### Story 1.2: User Authentication & Security

As a User,
I want to register and login securely,
So that I can access my private workspace.

**Acceptance Criteria:**

**Given** I am on the login page
**When** I enter a valid email and password
**Then** I should be authenticated via NextAuth.js
**And** I should receive a JWT token that permits access to backend API endpoints
**And** My password should be stored as a salted hash in the database
**And** I should be redirected to the dashboard upon success

### Story 1.3: Workspace Management (Multi-tenancy)

As a Business Owner,
I want to create a workspace and invite my assistant,
So that we can collaborate on our products.

**Acceptance Criteria:**

**Given** I am a logged-in user without a workspace
**When** I complete the onboarding flow
**Then** A new Workspace entity is created in the DB
**And** My user record is linked to this Workspace as 'Owner'
**And** Subsequent API requests include the Workspace ID context
**And** I can generate an invite link to send to another user

### Story 1.4: Smart File Upload Component (Frontend)

As a User,
I want to drag and drop product images and PDF documents,
So that they can be prepared for parsing.

**Acceptance Criteria:**

**Given** I am on the dashboard content area
**When** I drag a PDF file into the dropzone
**Then** The UI should visually indicate file acceptance
**And** The file should be parsed locally (client-side) using pdf.js to extract text preview
**And** I should see a "Ready to Upload" status
**And** The UI should match the `SmartDropzone` design from UX specs

### Story 1.5: Asset Storage Service (MinIO Integration)

As a System,
I want to securely store uploaded files in object storage,
So that they can be accessed by AI workers later.

**Acceptance Criteria:**

**Given** A user has selected a file to upload
**When** The upload action is triggered
**Then** The backend should generate a Presigned URL for MinIO
**And** The frontend should upload the file binary directly to MinIO
**And** The backend should record the file metadata (path, size, type) in the `assets` table
**And** The asset should be associated with the current Workspace

### Story 1.6: Product Category Selection

As a User,
I want to categorize my uploaded product,
So that the AI knows the context of the generation.

**Acceptance Criteria:**

**Given** I have successfully uploaded a file
**When** I select a category (e.g., "Clothing", "Electronics") from the list
**Then** The selection should be saved to the project context in the DB
**And** I should be navigated to the next step (Style Selection)


## Epic 2: The Core - AI Visual Asset Studio

Deliver the primary distinctive value: "One Click, One Store". Users can generate high-quality image sets from their uploads, edit/annotate them, and download the results.

### Story 2.1: Style Selection & Generation Trigger

As a User,
I want to select a visual style for my product,
So that I can control the aesthetic of the generated images.

**Acceptance Criteria:**

**Given** I have completed the category selection step
**When** I view the style selection screen
**Then** I should see 6 distinct style cards (e.g., Modern, Luxury) with visual previews
**And** Selecting a style and clicking "Generate" should initiate a backend process
**And** I should immediately see a "Generating" loading state

### Story 2.2: AI Generation Worker (Celery/Redis)

As a Developer,
I want a robust asynchronous worker to handle image generation,
So that the user interface doesn't freeze during long-running AI tasks.

**Acceptance Criteria:**

**Given** A generation task is submitted to the Redis queue
**When** The Celery worker picks up the task
**Then** It should call the configured AI Image Generation API
**And** It should publish real-time status updates (e.g., "Designing...", "Rendering...") to Redis
**And** Upon completion, the result URLs should be saved to the database
**And** The task status should be updated to "Completed" or "Failed" with error details

### Story 2.3: SVG Preview Card & Editor

As a User,
I want to view and organize the generated images,
So that I can curate the final set for my store.

**Acceptance Criteria:**

**Given** The generation process is complete
**When** I view the results grid
**Then** Each image should be displayed in an interactive `SVGPreviewCard` component
**And** I should be able to drag and drop cards to reorder them
**And** I should be able to edit specific text fields on the card (if applicable)

### Story 2.4: Reference Image Attachment

As a User,
I want to attach a reference image to a specific generation slot,
So that I can guide the AI to match a specific look.

**Acceptance Criteria:**

**Given** I am viewing a specific image card
**When** I click the "Add Reference" button
**Then** I should be able to upload a local image
**And** The reference image should be visibly attached to the card
**And** Triggering "Regenerate" on this card should include the reference image in the AI prompt

### Story 2.5: Long Image Generation (Canvas Stitcher)

As a User,
I want to download all my images as a single long detail page,
So that I can upload it directly to e-commerce platforms.

**Acceptance Criteria:**

**Given** I am satisfied with the ordered image set
**When** I click the "Preview Long Image" button
**Then** The `CanvasStitcher` component should render all cards vertically into a single canvas
**And** I should see a scrollable preview of the result
**And** I should be able to download the final result as a high-quality PNG file

## Epic 3: Content Power - AI Copywriting Studio

Enable text generation capability. Users can generate SEO titles, descriptions, and FAQs derived from their uploaded documents.

### Story 3.1: Copywriting Studio UI

As a User,
I want a dedicated interface for generating product text,
So that I can focus on creating catchy copy without visual distractions.

**Acceptance Criteria:**

**Given** I have selected the "Smart Copy" module
**When** I view the dashboard
**Then** I should see a tabbed interface for "Titles", "Selling Points", and "FAQ"
**And** I should see the parsed product information (from Epic 1) in a side panel
**And** Each tab should have a "Generate" button

### Story 3.2: AI Copy Generation Service

As a Developer,
I want to use an LLM to generate diverse marketing copy,
So that the output is high-quality and varied.

**Acceptance Criteria:**

**Given** A generation request triggered from the UI
**When** The backend receives the request
**Then** It should construct a prompt including the parsed product details
**And** It should call the LLM API to generate the specific type of content (e.g., 5 SEO titles)
**And** The result should be returned as a structured JSON list

### Story 3.3: Copy Interaction & Export

As a User,
I want to easily copy the generated text,
So that I can paste it directly into my e-commerce listing.

**Acceptance Criteria:**

**Given** Generated text is displayed on the screen
**When** I hover over a text block
**Then** I should see a "Copy" icon
**And** Clicking it should copy the text to my system clipboard
**And** A toast notification should confirm "Copied to clipboard"


## Epic 4: Multimedia - AI Video Studio

Expand to video generation. Users can generate short creative or functional videos from their static assets.

### Story 4.1: Video Studio UI & Mode Selection

As a User,
I want to choose the type of video I want to create,
So that the output matches my marketing goal (Ad vs. Intro).

**Acceptance Criteria:**

**Given** I am in the Video Studio module
**When** I select "Creative Ad" mode
**Then** I should be able to choose a duration (15s/30s)
**And** I should see a description of what this mode produces
**And** I should be able to select background music from a preset list

### Story 4.2: Script & Storyboard AI Service

As a Developer,
I want the system to automatically generate a video script,
So that the video has a coherent narrative structure.

**Acceptance Criteria:**

**Given** A video generation request
**When** The backend processes the request
**Then** It should use the product info to generate a script (text for TTS)
**And** It should generate a storyboard list (sequence of image prompts or asset references)
**And** This structured data should be saved to the database

### Story 4.3: Video Rendering Engine

As a System,
I want to render the final MP4 video file,
So that the user has a deliverable asset.

**Acceptance Criteria:**

**Given** A formulated storyboard and script
**When** The video rendering task runs (e.g., using FFMPEG or external API)
**Then** It should combine images, transitions, and audio
**And** It should produce a valid MP4 file
**And** The progress should be reported (rendering video takes time)

### Story 4.4: Video Preview & TTS Integration

As a User,
I want to preview the video and hear the voiceover,
So that I can verify the quality before downloading.

**Acceptance Criteria:**

**Given** The video generation is complete
**When** I view the result
**Then** I should be able to play the video in the browser
**And** The video should include the AI-generated voiceover (TTS)
**And** I should ideally be able to regenerate just the voiceover if needed


## Epic 5: SaaS Maturity - Subscription & Admin

Enable business limits and management. Users can view quotas/upgrade. Admins can manage the platform.

### Story 5.1: Subscription Tiers & Quota Middleware

As a Developer,
I want to enforce usage limits based on subscription tiers,
So that we can monetize the platform and prevent abuse.

**Acceptance Criteria:**

**Given** A user makes a generation request
**When** The request hits the API middleware
**Then** It should check the user's remaining quota for that period
**And** If quota is exceeded, return 402 Payment Required
**And** Valid requests should decrement the quota usage counter

### Story 5.2: User Usage Dashboard

As a User,
I want to see my current plan and usage,
So that I know when I need to upgrade.

**Acceptance Criteria:**

**Given** I am on the dashboard settings page
**When** I view the "Billing" section
**Then** I should see my current plan (e.g., "Free Trial")
**And** I should see a progress bar of my usage (e.g., "5/10 Images")
**And** I should see an "Upgrade" button (functionality can be mocked for MVP)

### Story 5.3: Admin Dashboard - Stats & Logs

As an Admin,
I want to view system health and usage statistics,
So that I can monitor the platform's performance.

**Acceptance Criteria:**

**Given** I am logged in with an admin role
**When** I access the `/admin` route
**Then** I should see key metrics cards (Total Users, Total Generatons)
**And** I should see a table of recent system logs/errors
**And** Regular users should catch a 403 Forbidden if they try to access this

### Story 5.4: User Management & Task Retry

As an Admin,
I want to manage users and retry failed tasks,
So that I can support customers who encounter issues.

**Acceptance Criteria:**

**Given** I am viewing the Admin Dashboard
**When** I select a specific user
**Then** I should see their recent task history
**And** If a task failed, I should see a "Retry" button
**And** Clicking "Retry" should resubmit the task payload to the Celery queue
