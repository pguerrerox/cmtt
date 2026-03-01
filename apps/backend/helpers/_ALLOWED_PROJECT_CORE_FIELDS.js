/**
 * Allowed project-core payload fields for repository create/update operations.
 *
 * Snapshot and audit columns are system-managed and intentionally excluded.
 *
 * @type {string[]}
 */
export default [
    'order_id',
    'project_number',
    'project_description',
    'type',
    'status',
    'credit_status',
    'sales_price',
    'project_notes'
]
