# TODO

## P1
- Overhaul of the database structure as follows:
  - table `orders` with the following columns
    - `id` integer, primary key, autoincrement
    - `type` integer, not null, can be 0=INTERNAL or 1=NORMAL
    - `order_number` text, not null, unique, format is [abc][abc][0-9][0-9]-[0-9][0-9][0-9][0-9].
    - `order_received_date` integer, not null
    - `project_manager_id` integer, not null, fk -> project_managers.id
    - `sales_manager_id` integer, not null, fk -> sales_managers.id
    - `project_engineer_id` integer, not null, fk -> project_engineers.id
    - `ship_to_facility_id` integer, not null, fk -> facility.id
    - `customer_id` integer, not null, fk -> facility.customer_id
    - `quote_ref` text, not null
    - `po_ref` text
    - `payment_terms` text, not mull
    - `delivery_terms` text, not null
    - `penalty` integer, can be 1 or 0
    - `penalty_notes` text
    - `created_at` integer, not null
    - `updated_at` integer

    - `snapshots` at creation of the sales_manager, project engineer, project manager, facility and customer

  - table `projects_core`
    - `id` integer, primary key, autoincrement
    - `order_id` integer, not null
    - `project_number` integer, not null, can only by a 6 digit number xxxxxx
    - `project_description` text, not mull
    - `type` integer, not null, can be 0=Machine, 1=Auxiliaries, 2=Mold
    - `status` text, not null, default New, can be Ordered, Internal, Kicked, Packed, Shipped, Cancelled
    - `credit_status` integer, can be 0='deposit pending', 1=pbs pending, 2=credit cleared 
    - `sales_price` number
    - `project_notes` text

    contrains: one order can have multiple project types ex. machine, auxiliaries, and molds all with the same project number. Also an order can have multiple projects of the same type but these must have different project numbers ex. machine 1= project number 123123, machine 2= project number 123124.
    required snapshots is any for audits.

  - table `project_milestones` below are the requirements per project type
    Machine
      - `project_id` integer, fk -> project_core.id
      - `pm_wbs_date` integer
      - `pm_rto_date` integer
      - `pm_checklist_received_date` integer
      - `pm_checklist_submitted` integer
      - `kickoff_date_act` integer,
      - `pih_date_planned` integer,
      - `pih_date_act` integer,
      - `comt_date_planned` integer
      - `comt_date_act` integer
      - `test_date_planned` integer
      - `test_date_act` integer
      - `system_test_planned` integer
      - `system_test_act` integer
      - `customer_visit` integer
      - `ops_complete_date_planned` integer
      - `ship_date_planned` integer
      - `ship_date_act` integer
    Auxiliaries
      - `project_id` integer, fk -> project_core.id
      - `pm_wbs_date` integer
      - `pm_rto_date` integer
      - `pm_checklist_received_date` integer
      - `pm_checklist_submitted` integer
      - `kickoff_date_act` integer,
      - `aux_purc_po_date` integer
      - `aux_purc_exw_date_planned` integer
      - `aux_purc_exw_date_act` integer
    Molds
      - `project_id` integer, fk -> project_core.id
      - `pm_wbs_date` integer
      - `pm_rto_date` integer
      - `pm_pdf_received_date` integer
      - `pm_pdf_submitted` integer
      - `pm_korm` integer
      - `pm_korm_date` integer
      - `mih_date_planned` integer
      - `mih_date_act` integer
      - `inspection_date_planned` integer
      - `inspection_date_act` integer
      - `pih_date_planned` integer
      - `pih_date_act` integer
      - `mfg_date_planned` integer
      - `mfg_date_act` integer
      - `rih_date_planned` integer
      - `rih_date_act` integer
      - `hr_assy_date_planned` integer
      - `assy_date_planned` integer
      - `assy_date_act` integer
      - `test_date_planned` integer
      - `test_date_act` integer
      - `pp_recut_date_planned` integer
      - `pp_recut_date_act` integer
      - `recut_mfg_date_planned` integer
      - `post_recut_test_date_planned` integer
      - `ops_complete_date_planned` integer
      - `ship_date_planned` integer
      - `ship_date_act` integer
      snapshots and templates as required.

  - table `project_managers`
    - `id` integer, primary key, autoincrement
    - `fullname` text, not null
    - `username` text, not null
    - `email` text, not null
    - `role` text, not null, can be Team Leader, Senior Project Manager, Project Manager 
    - `isActive` integer, 0 or 1
    - `isAdmin` integer, 0 or 1
    audit columns?

  - table `sales_managers`
    - `id` integer, primary key, autoincrement
    - `fullname` text, not null
    - `email` text, not null

  - table `project_engineers`
    - `id` integer, primary key, autoincrement
    - `fullname` text, not null
    - `email` text, not null

  - table `customers`
    - `id` integer, primary key, autoincrement
    - `name` text, not null
    - `headquaters_address` text, not null
    - `headquarter_contacts` text, not null

  - table `facilities`
    - `id` integer, primary key, autoincrement
    - `customer_id`, integer, not null, fk -> customers.id
    - `plant_name` text, not null
    - `plant_address` text, not null
    - `plant_contacts` text, not null

## P
  - Milestones per project type
      - MOLD / COLD HALF: PIH - RIH - ASSY - TEST - CV - PACK - EXW    
      - HR: PIH - ASSY - PACK - EXW
      - REFURB: MIH - INSPECT. - PIH - ASSY - TEST? - PACK - EXW
      - COMPO. PCK / COMPA. KITS: PIH - ASSY? - PACK - EXW
      - MACHINE: PIH - MC TEST - SYST. TEST - CV - PACK - EXW
      - AUXILIARIES: PIH - TEST - PACK - EXW
    - Project Notes / Extra Information
## P
- Project Page Inteligence
      - Automatic Delay calculation
      - Visual Timeline
      - Alerts Log
      - Change Log (Audit backend / database)
## P
- Add server information to the `/` page.
      - Last external infomation refresh.
      - Number of projects by Status.
## P
- Backend: Implement service to read a `PDF` file and extract information about a project.
  After creating a project the manager has the option to upload on the frontend an order report, the backend will read the file and extract the programmed information. 


## Bugs to Fix
- `/admin` the create manager form is showing a "Manager created successfully" only after using the edit manager button.


## Ideas
- Auth implementation?
- Storage for files?
- Pre-process data from projects?
- Add project 
- Identify projects by type: Machine, Mold, Refurb, Conversions
- Project milestones teams notifications.
- Project milestones email notifications.
- Changes Audit system.
- Add basic worker observability (run logs + stale queue alert/check).
- Server observability (run logs).



Great request. I reviewed your current admin tabs and backend APIs, and here’s the execution plan to add batch insert cleanly with your existing architecture.
- Managers tab: apps/frontend/src/pages/admin/AdminManagersTab.jsx
- Sales managers tab: apps/frontend/src/pages/admin/AdminSalesManagersTab.jsx
- Project engineers tab: apps/frontend/src/pages/admin/AdminProjectEngineersTab.jsx
- Customers tab: apps/frontend/src/pages/admin/AdminCustomersTab.jsx
- Customer facilities already managed in apps/frontend/src/pages/AdminCustomerDetailsPage.jsx
- Existing APIs are single-create only, which is fine for a first batch feature (frontend orchestrated).
Plan
- Add a reusable “Batch Insert Panel” UI pattern in each admin tab with:
  - Batch Insert button (toggles textarea panel)
  - Help button (shows required CSV column order + sample)
  - multiline textarea for pasted CSV rows
  - Validate and Import actions
  - result summary: created/skipped/failed with row-level errors
- Keep single-record forms unchanged.
1) Shared Frontend Parser Utilities
- Add apps/frontend/src/shared/batchCsv.js:
  - split lines safely
  - simple CSV parsing with quoted fields support
  - normalize trims/empty values
  - parse booleans (1/0, true/false, yes/no)
  - row-level validation helpers
- Add apps/frontend/src/shared/batchResults.js helper to standardize import report shape.
2) Managers Batch
- In AdminManagersTab.jsx, add batch UI + handler.
- CSV expected order (help text):
  - username,fullname,email,role,isActive,isAdmin
- Validation:
  - required: username/fullname/email/role
  - role in allowed set: Team Leader|Senior Project Manager|Project Manager|Guest
  - defaults: isActive=1, isAdmin=0
- Import strategy:
  - sequential or limited concurrency (recommended 5)
  - call existing createManager per row
  - collect per-row errors from API response
3) Project Engineers Batch
- In AdminProjectEngineersTab.jsx, add batch UI + handler.
- CSV expected order:
  - fullname,email,isActive
- Validation:
  - required: fullname
  - defaults: isActive=1
- Import via existing createProjectEngineer.
4) Sales Managers Batch
- In AdminSalesManagersTab.jsx, add batch UI + handler.
- CSV expected order:
  - fullname,email,isActive
- Validation:
  - required: fullname
  - defaults: isActive=1
- Import via existing createSalesManager.
5) Customers + Sites Batch
- In AdminCustomersTab.jsx, add dedicated batch panel for customer + site rows.
- Recommended one-row-per-site shape:
  - customer_name,headquarters_address,headquarter_contacts,project_manager_username,sales_manager_email,project_engineer_email,site_name,site_address,site_contacts
- Flow:
  - preload managers/sales/project-engineers (already done in tab)
  - resolve references to IDs:
    - manager by username
    - sales manager by email
    - project engineer by email
  - group rows by customer_name
  - create customer once (first row metadata wins, warn on mismatches)
  - create facilities for each grouped site using createFacility (or /customer-facilities)
- Result summary should include:
  - customers created
  - sites created
  - rows failed (with reason)
6) UX / Safety
- Add “dry-run validate” before import.
- Prevent import when parse/validation errors exist.
- Show downloadable/copyable “error rows” text block.
- Add duplicate-row detection in pasted data (same key fields in same batch).
- Keep all operations non-destructive (insert only).
7) Styling
- Extend apps/frontend/src/styles.css with minimal classes:
  - .batch-panel, .batch-actions, .help-box, .batch-textarea, .batch-summary
- Reuse existing visual language (panel, ghost, form-grid) for consistency.
8) Tests
- Add parser unit tests:
  - quoted CSV, missing columns, boolean coercion, trimming
- Add tab-level UI tests (if test infra exists) or at least structured manual QA checklist:
  - paste valid rows -> import success
  - paste invalid rows -> row errors
  - mixed valid/invalid -> partial success report
- Backend API tests not required if reusing existing create endpoints unchanged.
9) Delivery Sequence
1. Build shared parser/utils
2. Implement managers batch
3. Implement project engineers + sales managers batch
4. Implement customers+sites grouped import
5. Styling + help content polish
6. QA and verification in admin flows
One targeted question to finalize before implementation:
- For customers+sites, do you want the recommended single CSV row per site format (customer fields repeated for each site), or two separate pastes (first customers, then sites)?  
  - Recommended: single CSV row per site; it’s easier for admins and avoids cross-step mistakes.
  - This choice changes only the batch parser/grouping logic and help format, not your existing DB/API model.