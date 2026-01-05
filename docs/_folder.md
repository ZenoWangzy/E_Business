# Folder Map: Documentation Module

**[SCOPE]**:
This folder (`/docs`) is the **Knowledge Base** for the E_Business project. It contains all product requirements, architecture designs, sprint artifacts, and development guidelines.

**[MEMBERS]**:
- `prd.md`: **Product Requirements**. Core product vision and features.
- `architecture.md`: **Technical Architecture**. System design and decisions.
- `epics.md`: **Epic Definitions**. Major feature groupings.
- `implementation_plan.md`: **Implementation Roadmap**. Development timeline.
- `sprint-artifacts/`: **Sprint Outputs**. User stories, status reports, retrospectives.
  - `sprint-status.yaml`: **Sprint Tracking**. Current sprint status and blocked items.
- `analysis/`: **Analysis Reports**. Deep-dive technical analysis.

**[EXTERNAL LINKS]**:
- `/experience/`: **Experience Library**. Development knowledge base with debug cases, best practices, and troubleshooting guides.
  - `experience/debug/`: Debugging case studies with root cause analysis
  - `experience/authentication/`: Authentication & security patterns
  - `experience/database/`: Database design and migration experiences
  - `experience/api-design/`: API design patterns and practices
  - `experience/async-tasks/`: Celery and async task handling
  - `experience/storage/`: File handling & MinIO
  - `experience/ai-integration/`: AI service patterns
  - `experience/frontend/`: Frontend development patterns
  - `experience/testing/`: Testing strategies and practices
  - `experience/performance/`: Performance optimization
  - `experience/deployment/`: Deployment and operations

**[CONSTRAINTS]**:
- **Chinese First**: All documentation in Simplified Chinese.
- **Markdown Format**: Use standard Markdown with mermaid diagrams.
- **Version Control**: Update changelog on significant changes.
- **Sprint Sync**: Keep sprint-status.yaml current after each sprint.
- **Accuracy**: Documentation must reflect actual code implementation.
