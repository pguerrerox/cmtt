/**
 * SQL schema for the `customers` table.
 *
 * @type {string}
 */
export default `
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    headquarters_address TEXT NOT NULL,
    headquarter_contacts TEXT NOT NULL,
    project_manager_id INTEGER NOT NULL,
    sales_manager_id INTEGER NOT NULL,
    project_engineer_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (project_manager_id) REFERENCES project_managers(id) ON DELETE RESTRICT,
    FOREIGN KEY (sales_manager_id) REFERENCES sales_managers(id) ON DELETE RESTRICT,
    FOREIGN KEY (project_engineer_id) REFERENCES project_engineers(id) ON DELETE RESTRICT
)`
