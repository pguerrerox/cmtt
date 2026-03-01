/**
 * SQL schema for the `orders` table.
 *
 * @type {string}
 */
export default `
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type INTEGER NOT NULL CHECK (type IN (0, 1)),
    order_number TEXT NOT NULL UNIQUE CHECK (order_number GLOB '[A-Za-z][A-Za-z][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9]'),
    order_received_date INTEGER NOT NULL,
    project_manager_id INTEGER NOT NULL,
    sales_manager_id INTEGER NOT NULL,
    project_engineer_id INTEGER NOT NULL,
    ship_to_facility_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    quote_ref TEXT NOT NULL,
    po_ref TEXT,
    payment_terms TEXT NOT NULL,
    delivery_terms TEXT NOT NULL,
    penalty INTEGER NOT NULL DEFAULT 0 CHECK (penalty IN (0, 1)),
    penalty_notes TEXT,
    snapshot_customer_id INTEGER,
    snapshot_customer_name TEXT,
    snapshot_facility_id INTEGER,
    snapshot_facility_name TEXT,
    snapshot_project_manager_id INTEGER,
    snapshot_project_manager_name TEXT,
    snapshot_sales_manager_id INTEGER,
    snapshot_sales_manager_name TEXT,
    snapshot_project_engineer_id INTEGER,
    snapshot_project_engineer_name TEXT,
    snapshot_created_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (project_manager_id) REFERENCES project_managers(id) ON DELETE RESTRICT,
    FOREIGN KEY (sales_manager_id) REFERENCES sales_managers(id) ON DELETE RESTRICT,
    FOREIGN KEY (project_engineer_id) REFERENCES project_engineers(id) ON DELETE RESTRICT,
    FOREIGN KEY (ship_to_facility_id) REFERENCES customer_facilities(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (snapshot_customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (snapshot_facility_id) REFERENCES customer_facilities(id) ON DELETE SET NULL,
    FOREIGN KEY (snapshot_project_manager_id) REFERENCES project_managers(id) ON DELETE SET NULL,
    FOREIGN KEY (snapshot_sales_manager_id) REFERENCES sales_managers(id) ON DELETE SET NULL,
    FOREIGN KEY (snapshot_project_engineer_id) REFERENCES project_engineers(id) ON DELETE SET NULL
)`
