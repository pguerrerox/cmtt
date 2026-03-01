import operationsFields from '../../helpers/_OPERATIONS_MOLDS_FIELDS.js'

/**
 * Generated SQL column list for operations planned date fields.
 *
 * @type {string}
 */
const operationsColumns = operationsFields
    .map((field) => `    ${field} INTEGER`)
    .join(',\n')

/**
 * SQL schema for the `operations_mold_planned_dates` table.
 *
 * @type {string}
 */
export default `
CREATE TABLE IF NOT EXISTS operations_mold_planned_dates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT,
    project_type INTEGER CHECK (project_type IN (1, 2, 3)),
    project_number TEXT UNIQUE NOT NULL,
    project_description TEXT,
    ${operationsColumns},
    source_version TEXT,
    refreshed_at INTEGER NOT NULL
)`
