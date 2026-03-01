/**
 * SQL schema for the `project_milestone_templates` table.
 *
 * @type {string}
 */
export default `
CREATE TABLE IF NOT EXISTS project_milestone_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_type INTEGER NOT NULL CHECK (project_type IN (1, 2, 3)),
    milestone_code TEXT NOT NULL,
    label TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    required INTEGER NOT NULL DEFAULT 1 CHECK (required IN (0, 1)),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    template_version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (project_type, template_version, milestone_code),
    UNIQUE (project_type, template_version, sequence)
)`
