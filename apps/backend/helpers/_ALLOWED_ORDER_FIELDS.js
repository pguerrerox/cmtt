/**
 * Allowed order payload fields for repository create/update operations.
 *
 * Snapshot and audit columns are system-managed and intentionally excluded.
 *
 * @type {string[]}
 */
export default [
    'type',
    'order_number',
    'order_received_date',
    'project_manager_id',
    'sales_manager_id',
    'project_engineer_id',
    'ship_to_facility_id',
    'customer_id',
    'quote_ref',
    'po_ref',
    'payment_terms',
    'delivery_terms',
    'penalty',
    'penalty_notes'
]
