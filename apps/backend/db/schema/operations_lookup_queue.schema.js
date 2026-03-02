/**
 * SQL schema for the `operations_lookup_queue` table.
 *
 * @type {string}
 */
export default `
CREATE TABLE IF NOT EXISTS operations_lookup_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT,
    project_type INTEGER CHECK (project_type IN (1, 2, 3)),
    project_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_date INTEGER,
    next_attempt_date INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
)`
