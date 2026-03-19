# API

Base path: `/api`

## Managers (Admin)
- `POST /admin/createManager`
- `PATCH /admin/updateManager/:id`
- `DELETE /admin/deleteManager/:id`
- `GET /admin/managers`
- `GET /admin/manager/name/:name`
- `GET /admin/manager/id/:id`

## Managers (Read Only)
- `GET /managers`
- `GET /manager/name/:name`
- `GET /manager/id/:id`

## Projects
- `POST /createProject`
- `PATCH /modifyProject/:project_number`
- `DELETE /deleteProject/:project_number`
- `GET /projects`
- `GET /projects/manager/:manager_id`
- `GET /projects/customer/:customer_name`
- `GET /projects/:project_number`

## PSF Scanner
- `POST /psf/scan` (multipart upload; field name `psf`)
- `POST /psf/commit` (JSON draft commit)

## Notes
- Typical response codes: `200`, `201`, `400`, `404`, `409`, `500`.
- `createProject` returns `lookup_status` indicating immediate enrichment or queueing.
- Read-only manager routes are implemented in `apps/backend/routes/managers.routes.js`.
- Manager role values are constrained to: `Team Leader`, `Senior Project Manager`, `Project Manager`, `Guest`.
- Operations enrichment depends on running `npm run operations:import` to refresh `operations_planned_dates` from the Excel source.
- Auth and API versioning strategy should be defined before production rollout.
- PSF scanner uses a two-step flow: scan/review first, commit second.
