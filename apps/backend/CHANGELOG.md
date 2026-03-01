# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0] - 2026-03-01

### Added
- Added canonical domain model and routes for `orders`, `projects_core`, row-based milestones, and milestone templates.
- Added mold-specific operations source table (`operations_mold_planned_dates`) and mold operations field mapping helper.
- Added enrichment service with provider registry and mold-only lookup/queue flow, plus repository/route/worker tests for the new architecture.

### Changed
- Replaced legacy project/manager/customer-facility schema and repository naming with canonical `project_managers`, `project_engineers`, `sales_managers`, and `customer_facilities` conventions.
- Refactored project creation to seed milestones by template and return enrichment status (`enriched`, `queued`, `not_applicable`) based on project type.
- Updated operations lookup queue worker/scripts and workspace scripts to canonical `operations-lookup-queue` naming.

### Removed
- Removed legacy project schema/repository/routes (`projects`) and old lookup queue naming artifacts.

## [0.7.0] - 2026-02-26

### Added
- Added new domain tables and schemas for `salesmanagers`, `projecteng`, `customers`, and `facilities`.
- Added repositories and payload field allowlists for sales managers, project engineers, customers, and facilities.
- Added new API routes for entity CRUD/read flows, including admin create/update/delete routes for sales managers and project engineers.
- Added repository and route tests covering the new entities and route wiring.

### Changed
- Updated DB bootstrap and test DB bootstrap to initialize the new entity tables with foreign-key-safe ordering.

## [0.6.1] - 2026-02-22

### Added
- Added one-shot operations import worker commands (`worker:operations-import` in backend and `operations:import` at monorepo root) to populate `operations_planned_dates` from the Excel source.
- Added manager role allowlist helper and repository validation for manager create/update flows.
- Added tests for operations import worker behavior and manager role validation paths.

### Changed
- Updated manager schema to constrain `role` values to `Team Leader`, `Senior Project Manager`, `Project Manager`, and `Guest`.
- Improved operations date normalization to parse slash-formatted Excel date strings (for example `MM/DD/YYYY`) into integer timestamps.
- Removed debug logging from Excel import helper and updated backend/docs guidance for explicit operations import usage.

## [0.6.0] - 2026-02-22

### Added
- Added configurable CORS origin allowlist support via `CORS_ORIGINS`.
- Added managers router mounting in the API app factory so manager read endpoints are exposed under `/api`.

### Changed
- Enabled CORS middleware with credentials support and local Vite defaults for frontend development.
- Updated backend README environment variable documentation with `CORS_ORIGINS` usage.

## [0.5.1] - 2026-02-21

### Added
- Added comprehensive JSDoc coverage across backend entrypoints, routes, repositories, workers, DB bootstrap/schema modules, and helpers to standardize in-code API contracts.
- Added monorepo baseline docs for architecture and API usage (`docs/architecture.md`, `docs/api.md`) and backend/frontend workspace onboarding.

### Changed
- Migrated repository layout to a monorepo structure with backend code under `apps/backend` and workspace scripts at the repo root.
- Updated backend and root READMEs with workspace commands, worker execution guidance, and versioning policy notes.
- Updated API documentation to include manager read-only (non-admin) routes.

## [0.5.0] - 2026-02-21

### Added
- Added one-shot lookup-queue worker (`npm run worker:projects-lookup`) to enrich projects from operations planned dates.
- Added worker configuration env vars: `LOOKUP_BATCH_SIZE`, `LOOKUP_RETRY_DELAY_MS`, `LOOKUP_MAX_ATTEMPTS`.
- Added worker tests covering enrich, retry, and max-attempt failure behavior.

### Changed
- Extended lookup queue repository with worker support helpers: `getDueQueueItems`, `updateQueueEntry`, `removeFromQueue`.
- Expanded lookup queue repository tests for due selection, updates, and dequeue flows.
- Updated README with worker usage, scheduling guidance, and configuration.

## [0.4.0] - 2026-02-20

### Added
- Added operations planned dates schema and repository:
  - `db/schema/operations.schema.js`
  - `repositories/operations.repo.js` (`upsert`, `getOperationsPlanByProjectNumber`)
- Added project lookup queue schema and repository:
  - `db/schema/projectsLookup.schema.js`
  - `repositories/projectsLookup.repo.js` (`enqueueProject`, `getProjectByNumber`, `getAllQueue`)
- Added shared operations planned-date field map:
  - `helpers/_OPERATIONS_FIELDS.js`
- Added repository tests for new operations and queue repositories:
  - `tests/repositories/operations.repo.test.js`
  - `tests/repositories/projectsLookup.repo.test.js`

### Changed
- Updated DB bootstrap and test DB bootstrap to initialize operations and lookup queue tables.
- Wired `createProject` to:
  - enrich projects from `operations_planned_dates` when found
  - enqueue project numbers into `projects_lookup_queue` when not found
- Updated `POST /createProject` response to include `lookup_status` (`enriched` or `queued`).
- Normalized date/timestamp write paths in operations/queue repositories to store integer values.
- Expanded project repository/route tests to cover enriched and queued create-project flows.
- Updated `TODO.md` progress/status to reflect completed P0 items and P1 wiring.

## [0.3.1] - 2026-02-19

### Added
- Added a reusable app factory (`app.factory.js`) to create Express apps with injected DB context.
- Added a native Node test framework baseline (`npm test` using `node --test`).
- Added repository unit tests:
  - `tests/repositories/managers.repo.test.js`
  - `tests/repositories/projects.repo.test.js`
- Added route unit tests:
  - `tests/routes/admin.routes.test.js`
  - `tests/routes/projects.routes.test.js`
- Added an in-memory SQLite test DB helper (`tests/helpers/test-db.js`).

### Changed
- Refactored `app.js` to build the server via `createApp(db)` while preserving runtime behavior.
- Updated `README.md` Scripts section to document `npm test`.
- Expanded `TODO.md` with a more detailed phased backlog for operations lookup, queueing, scheduling, and tests.

## [0.3.0] - 2026-02-12

### Added
- Added `TODO.md` project task tracker.
- Added new Excel import module structure under `helpers/excel_import/`:
  - `index.js` (pipeline entrypoint)
  - `config.js` (headers/output shape config)
  - `transform.js` (row-group transformation)
  - `normalize.js` (date normalization)

### Changed
- Refactored Excel ingestion flow to use the new `helpers/excel_import` structure.
- Updated helper test runner to import from `helpers/excel_import/index.js`.
- Moved Excel source file location to `_ref-external-data/testData.xls`.
- Updated XLSX dependency source to SheetJS CDN tarball (`0.20.3`) to resolve file access/runtime compatibility.

### Removed
- Removed legacy Excel helper files:
  - `helpers/excel_DataReadyForSQLite.js`
  - `helpers/excel_CleanedData.js`
  - `helpers/excel_DateConverter.js`
  - `helpers/excel_Range.js`
- Removed deprecated helper dataset `helpers/data_active_managers.js`.

## [0.2.0] - 2026-02-12

### Added
- Added field allowlists for dynamic payload validation:
  - `helpers/_ALLOWED_PROJECT_FIELDS.js`
  - `helpers/_ALLOWED_MANAGER_FIELDS.js`
- Added project read endpoints in `routes/projects.routes.js`:
  - `GET /projects`
  - `GET /projects/manager/:manager_id`
  - `GET /projects/customer/:customer_name`
  - `GET /projects/:project_number`
- Added route/module JSDoc blocks and endpoint documentation for projects/admin-manager routes.

### Changed
- Enforced `project_number` as required at schema level: `db/schema/project.schema.js` (`UNIQUE NOT NULL`).
- Refactored `repositories/projects.repo.js` to use:
  - dynamic create/update SQL
  - payload validation with dropped-key reporting
  - consistent structured responses (`{ ok, data|message|error }`)
  - consistent DB/constraint error handling
- Refactored `repositories/managers.repo.js` to match the same dynamic/validated repository pattern and response contract.
- Updated `routes/projects.routes.js` to:
  - import from `repositories/projects.repo.js`
  - use structured repository results and consistent HTTP status mapping (`400/404/409/500`)
  - return router directly (`export default router`)
- Updated `routes/admin.routes.js` and `routes/managers.routes.js` with consistent status mapping based on repository errors.
- Updated admin manager update endpoint from `PUT` to `PATCH`:
  - `PATCH /admin/updateManager/:id`

### Removed
- Removed deprecated settings repository: `repositories/_x_settings.repo.js`
- Removed deprecated settings routes file: `routes/_x_settings.routes.js`

## [0.1.0] - 2026-02-11

### Changed
- Managers route/repository cleanup and auth-related cleanup.
- Refactored manager repository and routes to structured responses.
- Standardized public manager read endpoints.

## [0.0.7] - 2026-02-10

### Changed
- Introduced dynamic column mapping work for projects.
- Expanded project repository helpers and route coverage for project operations.

## [0.0.6] - 2026-02-10

### Changed
- Loaded environment variables in `db/db.js` before DB initialization.
- Fixed DB path resolution relative to module directory.

## [0.0.5]

### Changed
- Ongoing work on project services and project routes.

## [0.0.4]

### Changed
- Planning milestone.

## [0.0.3]

### Changed
- Completed managers services and admin routes related to managers.

## [0.0.2]

### Changed
- Started refactoring based on new logic.

## [0.0.1]

### Added
- First version after splitting backend/frontend codebases.
