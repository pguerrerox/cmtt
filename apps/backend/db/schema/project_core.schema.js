/**
 * SQL schema for the `projects_core` table.
 *
 * @type {string}
 */
export default `
CREATE TABLE IF NOT EXISTS projects_core (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    project_number TEXT NOT NULL CHECK (project_number GLOB '[0-9][0-9][0-9][0-9][0-9][0-9]'),
    project_description TEXT NOT NULL,
    type INTEGER NOT NULL CHECK (type IN (1, 2, 3)),
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Ordered', 'Internal', 'Kicked', 'Packed', 'Shipped', 'Cancelled')),
    credit_status INTEGER NOT NULL DEFAULT 1 CHECK (credit_status IN (1, 2, 3)),
    sales_price REAL,
    project_notes TEXT,
    snapshot_order_number TEXT,
    snapshot_project_type INTEGER,
    snapshot_status TEXT,
    snapshot_created_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    UNIQUE (order_id, project_number)
)`
