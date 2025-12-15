---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - /Users/ZenoWang/Documents/project/E_Business/docs/prd.md
  - /Users/ZenoWang/Documents/project/E_Business/docs/analysis/product-brief-E_Business-2025-12-12.md
workflowType: 'ux-design'
lastStep: 11
project_name: 'E_Business'
user_name: 'ZenoWang'
date: '2025-12-12'
---
# UX Design Specification E_Business

**Author:** ZenoWang
**Date:** 2025-12-12

---

## Executive Summary

This document outlines the UX Design Specification for the E_Business project, translating the strategic goals from the PRD into a tangible design vision.

### Project Vision

From a UX perspective, our vision is to create a seamless, intuitive, and almost magical experience that empowers non-professional e-commerce merchants to create high-quality marketing materials effortlessly. The design will prioritize speed, efficiency, and a "wow" factor in the core user workflow.

### Target Users

The primary user persona is "小张", a pragmatic and time-sensitive Taobao merchant. She is not a design professional and values straightforward, results-oriented tools. The UX must be simple, clear, and require no prior training.

### Key Design Challenges

1.  **Flow vs. Form**: The core 4-step process must be designed to feel like a creative journey, not a boring multi-page form. The challenge is to balance clear guidance with a sense of creative empowerment.
2.  **The Paradox of Choice**: Presenting multiple AI-generated styles must be handled carefully to avoid overwhelming the user. The UI needs to facilitate quick and easy comparison and selection.

### Design Opportunities

1.  **Maximizing the "Aha!" Moment**: The instant generation of multiple professional styles is the peak of the user experience. The design should amplify this moment through impactful presentation, potentially using animations and a clear, visually appealing layout to create a strong positive first impression.

---

## Core User Experience

This section defines the fundamental principles and interaction models that will shape the product's look and feel.

### Defining The Core Experience (定义核心体验)

The core experience is defined by **"Three Dedicated Studios" (文案/组图/视频)**. The user first selects their intent ("I need text", "I need images", or "I need video"), and instantly enters a specialized workspace optimized for that specific task. Each studio shares the same underlying asset library (uploaded product images) so context is never lost.

### Platform Strategy (平台策略)

*   **Primary Platform**: The product is a **Web Application**, accessible through any modern browser.
*   **Design Priority**: The design will be **Desktop-First**, prioritizing the experience on larger screens where users are most likely to perform content management tasks.
*   **Mobile Strategy**: The application will be **Mobile-Compatible**, ensuring that all core functionalities are accessible and usable on mobile web browsers, though it may not be optimized for small screens in the MVP.

### Effortless Interactions (轻松交互)

The most critical interaction to make effortless is the primary generation flow. This includes:
*   **One-Click Upload**: Uploading images and documents should be a simple, single-action process.
*   **Instant Preview**: As soon as the user makes a choice (e.g., selects a style), the results should appear almost instantly, creating the "Aha!" moment.
*   **Simple Navigation**: Moving between the 4 steps of the workflow should be clear and linear.

### Critical Success Moments (关键成功时刻)

The single most critical success moment is when the user first sees the array of professionally designed images generated from their single, simple upload. This is the moment the product proves its value and hooks the user. The UX design must maximize the positive impact of this moment.

### Experience Principles (体验原则)

The following principles will guide all subsequent UX design decisions:

1.  **Efficiency First (效率至上)**: Every click and every second counts. The design must ruthlessly eliminate friction from the core workflow.
2.  **Instant Gratification (即时满足)**: The user should see the result of their actions immediately. The "Aha!" moment of generation is the centerpiece of the experience.
3.  **Guided Creation (引导式创造)**: Users are not designers. The interface should guide them through choices, not present them with a blank canvas. It should feel like a helpful expert is sitting next to them.
4.  **Clarity Over Clutter (清晰胜于炫技)**: The interface must be clean and intuitive. "Magical" animations or visual effects will only be considered if they enhance, rather than distract from, the core workflow's clarity.

---

## Desired Emotional Response

The design of the E_Business platform should be guided by a clear set of emotional goals. The user interface, interaction patterns, and feedback mechanisms will all work in concert to evoke the following feelings.

### Primary Emotional Goals (主要情感目标)

1.  **Delight & Surprise (惊喜)**: This is the core emotional hook. The moment a user sees a full suite of professional images generated from a single photo should feel magical and exceed their expectations. This is the "Aha!" moment that drives word-of-mouth.
2.  **Efficiency & Productivity (高效)**: Upon completing their task, users should feel a strong sense of accomplishment and relief. The primary takeaway should be "That was fast" and "This saved me so much time and effort."
3.  **Empowerment & Control (掌控感)**: Despite the complexity of the underlying AI, the user should never feel overwhelmed. The experience should feel like a guided partnership, making them feel capable and in control of producing professional results, regardless of their skill level.

### Emotional Journey Mapping (情绪旅程地图)

*   **Discovery**: A user should feel **Hopeful** and **Curious** when they first hear about the product from a friend.
*   **Onboarding & First Use**: The initial interaction should evoke a feeling of **Simplicity** and **Ease**.
*   **The "Aha!" Moment**: The instant generation of results must trigger **Surprise**, **Delight**, and a sense of **Magic**.
*   **Task Completion**: After downloading the assets, the user should feel **Accomplished**, **Productive**, and **Relieved**.

### Design Implications (对设计的影响)

To achieve these emotional goals, the design will:
*   Use clean, simple, and uncluttered interfaces to inspire confidence and a sense of control.
*   Employ animations and micro-interactions to enhance the "magical" feeling of the generation step.
*   Prioritize performance and immediate feedback to reinforce the feeling of efficiency.
*   Guide the user step-by-step, removing ambiguity and making them feel supported throughout the process.

---

## UX Pattern Analysis & Inspiration

This chapter analyzes successful design examples to inform our UX strategy.

### Inspiring Product Analysis (灵感产品分析)

*   **Inspiration Source**: Apple's website (apple.com)
*   **Core Qualities**: Simple, elegant, modern.
*   **Reason for User Affinity**: It is convenient, looks simple, and is simple to operate. It conveys a sense of premium quality and trust while maintaining a very low cognitive load.

### Transferable UX Patterns (可借鉴的UX模式)

We should not copy Apple's design directly, but we can borrow from its underlying design philosophy:

*   **Visual Patterns**:
    *   **Generous Whitespace**: Creates a premium, uncluttered feel and guides focus.
    *   **High-Quality Typography & Imagery**: Ensures our UI text and generated images look crisp and professional.
    *   **Singular Focus**: Each step in our wizard should have one clear, primary call-to-action.

*   **Interaction Patterns**:
    *   **Smooth Transitions**: Animations should be fluid, not jarring, especially for the "Aha!" moment reveal.
    *   **Progressive Disclosure**: Only show necessary controls at each step, hiding complexity until needed.

### Anti-Patterns to Avoid (应避免的反面模式)

To maintain a clean and elegant experience, we must avoid:
*   **Cluttered Interfaces**: Overloading the screen with too many buttons and options.
*   **Inconsistent Visual Language**: Using a mishmash of colors, fonts, or styles.
*   **Complex, Nested Menus**: Navigation should be as flat and simple as possible.

### Design Inspiration Strategy (设计灵感策略)

*   **Adopt**: Apple's minimalist aesthetic, use of whitespace, and focus on high-quality typography.
*   **Adapt**: Apple's "single key action" principle for our 4-step wizard. Adapt their smooth animations for our AI generation reveal.
*   **Avoid**: Cluttered layouts and inconsistent design elements.

---

## Design System Foundation

### Design System Choice (设计系统的选择)

We will adopt a **Themeable Design System** approach. This strategy provides the best balance between development speed and brand uniqueness, which is ideal for our "Experience-Oriented MVP".

Examples of systems that fit this approach include, but are not limited to, **MUI (formerly Material-UI), Chakra UI, or a Tailwind CSS-based component library**. The final choice of library will be made by the development team, but it will follow this themeable philosophy.

### Rationale for Selection (选择的理由)

*   **Speed & Quality**: Leverages a library of pre-built, accessible, and well-tested components, which is critical for a fast-moving MVP.
*   **Customization**: Provides deep theming capabilities, allowing us to customize colors, typography, spacing, and component styles to achieve our desired "simple, elegant, modern" Apple-like aesthetic, rather than a generic look.
*   **Focus**: Allows the team to focus on building the core workflow and unique features, rather than reinventing basic components like buttons and forms.
*   **Alignment with Principles**: Supports our "Clarity Over Clutter" principle by providing a consistent and coherent visual language.

### Implementation Approach (实施方法)

1.  **Selection**: The development team will select a specific themeable UI library that aligns with the chosen front-end technology stack (e.g., React).
2.  **Theming**: A core theme (colors, fonts, spacing, component variants) will be defined to reflect the Apple-inspired design direction.
3.  **Component Usage**: Development will prioritize using components from the chosen library. Custom components will only be built for features that are truly unique to our application (e.g., the AI result display grid).

---

## Visual Design Foundation

This foundation is strictly derived from the existing `Website front end` codebase to ensure pixel-perfect consistency (像素级一致性).

### Technology Stack & Design System
*   **Framework**: React + Vite
*   **Styling Engine**: Tailwind CSS v4
*   **Component primitive**: Radix UI (Headless)
*   **UI Library**: Shadcn/UI (Copy-paste component architecture)
*   **Icons**: Lucide React

### Color System (OKLCH)
We utilize the modern OKLCH color space for perceptually uniform colors, matching `index.css`.

*   **Background**: `oklch(1 0 0)` (Pure White)
*   **Foreground (Text)**: `oklch(.145 0 0)` (Deep Black/Gray)
*   **Primary Action**: `oklch(.205 0 0)` (Dark, nearly black accent)
*   **Primary Foreground**: `oklch(.985 0 0)` (White text on primary)
*   **Muted Foreground**: `oklch(.556 0 0)` (Medium Gray for secondary text)
*   **Accent (Hover/Select)**: `oklch(.97 0 0)` (Very light gray)
*   **Borders**: `oklch(.922 0 0)` (Light gray)

### Typography System
We use the **System Font Stack** to ensure the application feels native, fast, and integrates seamlessly with the user's OS (aligning with the Apple-like aesthetic).

*   **Font Family**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
*   **Base Size**: `16px` (1rem)
*   **Scale**:
    *   `text-xs`: 0.75rem (12px)
    *   `text-sm`: 0.875rem (14px)
    *   `text-base`: 1rem (16px)
    *   `text-lg`: 1.125rem (18px)
    *   `text-xl`: 1.25rem (20px)

### Spacing & Layout Foundation
*   **Spacing Unit**: 4px base (Tailwind default). `p-4` = 16px.
*   **Radius System**:
    *   `rounded-md`: `0.375rem` (6px) - Standard UI elements
    *   `rounded-lg`: `0.5rem` (8px) - Cards and larger containers
    *   `rounded-xl`: `0.75rem` (12px) - Modals or large surfaces
*   **Container**: Standard `container` class with responsive max-widths.

### Accessibility Considerations
*   **Contrast**: The high contrast between Background (White) and Foreground (Deep Black) meets WCAG AAA standards for text.
*   **Focus States**: All interactive elements (Inputs, Buttons) must maintain the Shadcn ring-offset focus visible patterns (`ring-2 ring-ring ring-offset-2`).

---

## Design Direction Decision

### Chosen Direction: Existing Application Design Patterns
Per stakeholder requirements, we have bypassed the exploration of alternative variations to adopt the **Existing Application Design** as our definitive direction. This ensures pixel-perfect consistency and leverages the proven "Existing App" patterns.

### Key UI Patterns & Layout Strategy

#### 1. The "Triple-Sidebar" Layout Structure
We will replicate the sophisticated three-pane layout observed in `App.tsx`:

*   **Pane 1 (Leftmost - Fixed)**: **Global Navigation Rail** (width: ~60px).
    *   Contains high-level app context switching (Icons only).
    *   Floating style container with rounded corners.
*   **Pane 2 (Middle - Collapsible)**: **Contextual Sidebar** (width: ~240px).
    *   Contains specific navigation within the current context (e.g., Categories, Folders).
    *   Collapsible logic implementation.
*   **Pane 3 (Right - Main Content)**: **Dynamic Content Area**.
    *   Fluid width, adapts to sidebar states.
    *   Sticky Header with blur effect (`backdrop-filter: blur(10px)`).

#### 2. Top-Level Navigation Strategy (Module Switching)
To support the 3 distinct modules, we introduce a **Global Module Switcher** in the furthest left rail:
*   **Icon 1 (Doc/Pen)**: Smart Copywriting Studio (智能文案)
*   **Icon 2 (Image/Grid)**: Visual Asset Studio (智能组图)
*   **Icon 3 (Video/Play)**: Video Studio (视频工作台)
*   **Icon 4 (Folder)**: Asset Library (My Products)

This ensures users can jump between tasks (e.g., "Get text" -> "Get images") without losing their product context.

#### 2. Card Component Patterns
The product display cards will follow the existing `src/components/ui/card.tsx` and usage patterns:

*   **Visual Style**: Clean, white background with subtle border (`border-border`).
*   **Hover Effect**: Slight elevation or scale transform (`transform: scale(1.02)`) on hover to encourage interaction.
*   **Content Hierarchy**:
    *   Top: Image/Preview area.
    *   Middle: Title (bold, `text-lg`) + Status Badge.
    *   Bottom: Meta-actions (Edit, Delete, Select).

#### 3. Interaction & Animation
*   **Micro-interactions**: Use `transform` and `transition-all` for smooth hover states (buttons, cards).
*   **Transitions**: Sidebar expansion/collapse uses smooth width transitions (`transition: width 0.3s ease`).
*   **Feedback**: Interactive elements use immediate visual feedback (color change `bg-accent`, scale).

### Implementation Approach
This direction allows us to directly reuse the `shadcn/ui` components found in the `Website front end` codebase, minimizing development time while ensuring high-quality design consistency. We will port the `Layout`, `Sidebar`, and `Card` components directly.

---

## User Journey Flows

### Core Journey: Merchant "One-Click" Generation
This flow integrates the business logic from `logic.md` into our Triple-Sidebar UI.

#### Flow Diagram
```mermaid
graph TD
    Start[User Starts] --> Step1{Step 1: Upload}
    Step1 -->|Drop Files| Parse[Client-Side Parsing]
    Parse -->|PDF/Word/Excel| Preview[Immediate Text Preview]
    Preview -->|Confirm| Step2[Step 2: Category]
    
    Step2 -->|Search/Select| SelectCat[Category Selected]
    SelectCat --> Step3[Step 3: Style]
    
    Step3 -->|Choose 1 of 6| Gen[Step 4: SVG Generation]
    Gen -->|Auto-Generate| Editor[Editor Dashboard]
    
    subgraph Editor Workspace
    Editor -->|Drag & Drop| Sort[Reorder Cards]
    Editor -->|Upload Ref| Ref[Attach Reference Image]
    Editor -->|Text Edit| EditTxt[Update Overlay Text]
    Editor -->|Refresh| Regen[Regenerate Color/SVG]
    end
    
    Editor -->|Preview Toggle| Stitch[Canvas Stitching]
    Stitch -->|Scroll| LongView[Long Image Preview]
    LongView -->|Download| Export[Export PNG]

    subgraph Video Studio
    Gen -->|Switch Tab| VideoMode[Video Mode]
    VideoMode -->|Select Type| VType{Creative/Functional}
    VType -->|Creative| VGen1[Generate Ad (15s)]
    VType -->|Functional| VGen2[Generate Intro (30s)]
    VGen1 --> VPreview[Video Player]
    VGen2 --> VPreview
    VPreview -->|Download| VExport[Export MP4]
    end

    Step1 -->|Parsed| Context[Product Context Loaded]
    
    Context -->|Select Module| Choice{User Intent}
    
    Choice -->|Copywriting| MCP[Module 1: Smart Copy]
    MCP -->|Select Tone| GenText[Generate Title/Desc/SEO]
    GenText -->|Copy/Export| Done1[Text Ready]
    
    Choice -->|Visual Assets| MIMG[Module 2: Visual Assets]
    MIMG -->|Select Style| GenImg[Generate Main/Detail Images]
    GenImg -->|Editor| Stitch[Canvas Stitching]
    Stitch -->|Download| Done2[Images Ready]
    
    Choice -->|Video Studio| MVID[Module 3: Video]
    MVID -->|Select Type| VType{Creative/Functional}
    VType -->|Generate| GenVid[Generate Video]
    GenVid -->|Review| Done3[Video Ready]
```

### Detailed Interaction Specs

#### Step 1: Upload (Assets Ingestion)
*   **UI Layout**: Main Content Area displays a large, dashed-border Dropzone (Shadcn Card).
*   **Interaction**: 
    *   File Drag & Drop -> Instant parsing (`pdf.js`/`mammoth.js`) -> Text content appears in a scrollable "Parsed Content" panel below the dropzone.
    *   **No server upload** occurs at this stage; purely client-side feedback.

#### Step 2: Category Selection
*   **UI Layout**: 
    *   **Left Sidebar**: "Categories" list (collapsible).
    *   **Main Area**: Grid of Category Cards (Icon + Label).
*   **Interaction**: 
    *   Search bar at top filters the grid in real-time.
    *   Clicking a card selects it and auto-advances to Step 3.

#### Step 3: Style Selection
*   **UI Layout**: Grid of 6 Style Cards (Modern, Luxury, Fresh, Tech, Warm, Business).
*   **Visuals**: Each card displays a preview of the gradient/SVG style defined in `logic.md`.
*   **Interaction**: Single click selection -> Trigger Generation.

#### Step 4: Editor & Preview (The "Work" Surface)
*   **UI Layout**:
    *   **Top Bar**: Workflow Progress + "Preview/Download" Actions.
    *   **Main Area**: A responsive grid of generated Image Cards.
    *   **Right Panel (Contextual)**: Editor controls for the selected card.
*   **Key Patterns**:
    *   **360° Drag & Drop**: Cards can be rearranged freely within the grid.
    *   **Reference Upload**: Each card has a small "Plus" button to attach a reference image (displayed side-by-side).
    *   **Live Preview**: Toggle "Preview Mode" to render the Detail Pages as a continuous vertical stack (Canvas Stitching) overlaying the screen.

#### Step 4b: Video Studio (New Tab)
*   **Access**: A segmented control at the top of the Editor allows switching between "Image Studio" and "Video Studio".
*   **UI Layout**:
    *   **Left Panel**: Video Settings (Type: Creative/Functional, Duration, Background Music).
    *   **Main Area**: Large Video Player with Timeline scrubber.
    *   **Right Panel**: Script/Caption Editor (for Functional Intro).
*   **Interaction**: Click "Generate Video" -> System generates storyboard -> System renders video -> Auto-play.

---

## Component Strategy

### Design System Components (Shadcn/UI)
We will leverage the following existing components to build the majority of the UI:

*   **Layout**: `Sidebar`, `Sheet` (Mobile Nav), `ScrollArea` (Panels), `AspectRatio` (Image containers).
*   **Input/Actions**: `Button`, `Input` (Text edit), `Select` (Options), `Switch` (Toggles), `Slider` (Adjustments).
*   **Feedback**: `Progress` (Parsing/Generation), `Toast` (User alerts), `Skeleton` (Loading states), `Dialog` (Modals).
*   **Data Display**: `Card` (Base container), `Badge` (Status), `Table` (Batch view).

### Custom Components Specification
These components encapsulate the unique business logic defined in `logic.md`.

#### 1. `SmartDropzone`
*   **Purpose**: Handles file ingestion and **client-side parsing**.
*   **Logic**: Wraps `react-dropzone` with `pdf.js`, `mammoth.js`, and `xlsx`.
*   **States**: 
    1.  `Idle`: "Drop files here".
    2.  `Parsing`: Spinner with "Reading PDF...".
    3.  `Review`: Displays parsed text snippets for confirmation.

#### 2. `SVGPreviewCard`
*   **Purpose**: The core unit of the editor grid.
*   **Anatomy**:
    *   **Header**: Drag Handle (::dots::) + Delete Button.
    *   **Body**: Rendered SVG Content (Dynamic Reference).
    *   **Overlay**: "Reference Image" slot (Left) + "Regenerate" button.
    *   **Footer**: Text Input for direct content editing.
*   **Interaction**: Supports 360-degree drag-and-drop sorting.

#### 3. `CanvasStitcher`
*   **Purpose**: Generates the "Long Image" view for Detail Pages.
*   **Logic**: Uses HTML Canvas API to draw each `SVGPreviewCard`'s content vertically.
*   **Usage**: 
    *   **Preview Mode**: Scrollable viewport.
    *   **Export**: `canvas.toDataURL()` for PNG download.

#### 4. `StyleSelector`
*   **Purpose**: Visual selection of the 6 core styles.
*   **Content**: Grid of 6 clickable cards, each rendering a live CSS Gradient preview of the style (e.g., `linear-gradient(...)`).

#### 5. `VideoPlayer`
*   **Purpose**: Playback and review of generated videos.
*   **Features**: Play/Pause, Scrubber, Volume, Fullscreen, and "Download" action.


### Implementation Roadmap
1.  **Phase 1 (Core)**: Implement `SmartDropzone` (Parsing) and `SVGPreviewCard` (Rendering) to validate the "Input -> Output" loop.
2.  **Phase 2 (Editor)**: Implement `CanvasStitcher` and Drag-and-Drop sorting logic.
3.  **Phase 3 (Polishing)**: Add `Toast` notifications, `Skeleton` loaders, and final `StyleSelector` visuals.