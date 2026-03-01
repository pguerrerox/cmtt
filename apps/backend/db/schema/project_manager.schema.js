/**
 * SQL schema for the `project_managers` table.
 *
 * @type {string}
 */
export default `
CREATE TABLE IF NOT EXISTS project_managers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('Team Leader', 'Senior Project Manager', 'Project Manager')),
    isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
    isAdmin INTEGER NOT NULL DEFAULT 0 CHECK (isAdmin IN (0, 1)),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    updated_by TEXT
)`
