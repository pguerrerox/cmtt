/**
 * SQL schema for the `project_milestones` table.
 *
 * @type {string}
 */
export default `
CREATE TABLE IF NOT EXISTS project_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    milestone_code TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    required INTEGER NOT NULL DEFAULT 1 CHECK (required IN (0, 1)),
    planned_at INTEGER,
    actual_at INTEGER,
    milestone_status TEXT NOT NULL DEFAULT 'pending' CHECK (milestone_status IN ('pending', 'ready', 'in_progress', 'done', 'blocked', 'cancelled')),
    notes TEXT,
    template_version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (project_id) REFERENCES projects_core(id) ON DELETE CASCADE,
    UNIQUE (project_id, milestone_code),
    UNIQUE (project_id, sequence)
)`
