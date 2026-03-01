# CMTT Backend

Backend API and database for the Commitment Managers Tracking Tool. This service supports commitment managers as they track ongoing projects.

## What This Is
- Node.js + Express REST API
- SQLite database via `better-sqlite3`
- Auth and admin routes for project management workflows

## Local Development
1. Install dependencies from monorepo root:
   `npm install`
2. Configure environment variables (see below).
3. Run the server from monorepo root:
   `npm run dev:backend`

## Environment Variables
Create a `.env` file in `apps/backend`.

- `PORT` (optional, default `5000`)
- `DB_PATH` (optional, default `../databases/dev_main.db`, resolved relative to `db/db.js`)
- `LOOKUP_BATCH_SIZE` (optional, default `50`)
- `LOOKUP_RETRY_DELAY_MS` (optional, default `3600000`)
- `LOOKUP_MAX_ATTEMPTS` (optional, default `8`)
- `CORS_ORIGINS` (optional, comma-separated list, example `http://localhost:5173,http://localhost:4173`)

## Scripts
- `npm run start` starts the API with `nodemon`.
- `npm test` runs the test suite with Node's built-in test runner.
- `npm run worker:operations-lookup-queue` runs a single operations lookup queue worker pass.
- `npm run worker:operations-import` runs one operations-data import pass from the Excel source file.

From repo root, use workspace wrappers:
- `npm run dev:backend`
- `npm run test:backend`
- `npm run worker:operations-lookup-queue`
- `npm run operations:import`

## Operations Data Import
- The operations table is populated by an explicit one-shot import command and is not auto-loaded on API startup.
- Run manually when the source workbook changes:
  `npm run operations:import`
- Recommended trigger: scheduler/cron based on your operations data refresh cadence.

## Recurrent Lookup Worker
- The queue reconciliation runs as a one-shot worker command and should be triggered by an external scheduler.
- Recommended trigger: OS cron, container cron, or platform scheduled job.
- Example cron (every 15 minutes):
  `*/15 * * * * cd /path/to/cmtt-monorepo && npm run worker:operations-lookup-queue >> /var/log/cmtt-worker.log 2>&1`

## Changelog
See `CHANGELOG.md`.
