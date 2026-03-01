/**
 * SQL schema for the `customer_facilities` table.
 *
 * @type {string}
 */
export default `
CREATE TABLE IF NOT EXISTS customer_facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    plant_name TEXT NOT NULL,
    plant_address TEXT NOT NULL,
    plant_contacts TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
)`
