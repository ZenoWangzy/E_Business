# [FOLDER]: frontend/src/components/business
Domain-Specific "Smart" Components.

## [SCOPE]
- **Editors**: Rich text, Image canvas, Video timeline.
- **Uploaders**: Complex file dropzones with state.
- **Dashboards**: Data visualization widgets.

## [STRUCTURE]
- `SmartDropzone.tsx`: File upload with preview and validation.
- `EditorGrid.tsx`: Layout for content editing.
- `video/`, `copy/`: Domain-specific subfolders.

## [PROTOCOLS]
1. **Business Logic**: Can contain state and business rules.
2. **API Interaction**: May trigger Server Actions or API calls.
3. **Reusability**: Less reusable than `ui/`, specific to business domain.
