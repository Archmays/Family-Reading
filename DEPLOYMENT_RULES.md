# Deployment Rules

## Target

The final project is deployed as a static GitHub Pages site.

## Static-Only Constraints

The deployed site must not require:

- A server process
- A database
- A login system
- A private runtime API
- A background worker for core reading companion behavior

## Asset Publishing Rules

Do not place the original PDF directly in the publishing directory.

Do not upload unnecessary large intermediate files, temporary extraction outputs, OCR scratch files, review sheets, or uncompressed processing artifacts.

Only publish assets required by the family-facing companion panel.

## Build Rules

After a frontend app exists, run the project build after each meaningful change.

If the project has no build script yet, document that the current change is documentation-only and no build command exists.

## GitHub Pages Path Rules

Use resource paths that are compatible with GitHub Pages project subpath deployment, such as deployment under:

`/Family-Reading-Codex/`

Avoid absolute root paths unless the app build system explicitly rewrites them for the configured GitHub Pages base path.

