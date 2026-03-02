import allowedFields from '../helpers/_ALLOWED_ORDER_FIELDS.js'

const ORDER_NUMBER_PATTERN = /^[A-Za-z]{2}\d{2}-\d{6}$/

function hasValidForeignRow(db, table, id) {
    if (id === null || id === undefined || id === '') return false
    const row = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id)
    return !!row
}

function getFacilityCustomerId(db, facilityId) {
    const row = db
        .prepare('SELECT customer_id FROM customer_facilities WHERE id = ?')
        .get(facilityId)
    return row?.customer_id ?? null
}

function getSnapshotBundle(db, data) {
    const customer = db.prepare('SELECT id, name FROM customers WHERE id = ?').get(data.customer_id)
    const facility = db.prepare('SELECT id, plant_name FROM customer_facilities WHERE id = ?').get(data.ship_to_facility_id)
    const pm = db.prepare('SELECT id, fullname FROM project_managers WHERE id = ?').get(data.project_manager_id)
    const sm = db.prepare('SELECT id, fullname FROM sales_managers WHERE id = ?').get(data.sales_manager_id)
    const pe = db.prepare('SELECT id, fullname FROM project_engineers WHERE id = ?').get(data.project_engineer_id)

    return {
        snapshot_customer_id: customer?.id ?? null,
        snapshot_customer_name: customer?.name ?? null,
        snapshot_facility_id: facility?.id ?? null,
        snapshot_facility_name: facility?.plant_name ?? null,
        snapshot_project_manager_id: pm?.id ?? null,
        snapshot_project_manager_name: pm?.fullname ?? null,
        snapshot_sales_manager_id: sm?.id ?? null,
        snapshot_sales_manager_name: sm?.fullname ?? null,
        snapshot_project_engineer_id: pe?.id ?? null,
        snapshot_project_engineer_name: pe?.fullname ?? null
    }
}

function validateOrderPayload(db, data, isCreate = true) {
    const keys = Object.keys(data)
    const droppedKeys = keys.filter((key) => !allowedFields.includes(key))
    if (droppedKeys.length > 0) {
        return { ok: false, error: `invalid fields: ${droppedKeys.join(', ')}`, droppedKeys }
    }

    if (isCreate) {
        const requiredFields = [
            'type',
            'order_number',
            'order_received_date',
            'project_manager_id',
            'sales_manager_id',
            'project_engineer_id',
            'ship_to_facility_id',
            'customer_id',
            'quote_ref',
            'payment_terms',
            'delivery_terms'
        ]

        const missing = requiredFields.filter((field) => data[field] === undefined || data[field] === null || data[field] === '')
        if (missing.length > 0) {
            return { ok: false, error: `missing required fields: ${missing.join(', ')}` }
        }
    }

    if (data.order_number !== undefined && !ORDER_NUMBER_PATTERN.test(String(data.order_number))) {
        return { ok: false, error: 'invalid order_number format' }
    }

    if (data.type !== undefined && ![0, 1].includes(Number(data.type))) {
        return { ok: false, error: 'invalid type' }
    }

    if (data.penalty !== undefined && ![0, 1].includes(Number(data.penalty))) {
        return { ok: false, error: 'invalid penalty' }
    }

    const fkChecks = [
        ['project_manager_id', 'project_managers', 'project manager'],
        ['sales_manager_id', 'sales_managers', 'sales manager'],
        ['project_engineer_id', 'project_engineers', 'project engineer'],
        ['ship_to_facility_id', 'customer_facilities', 'facility'],
        ['customer_id', 'customers', 'customer']
    ]

    for (const [field, table, label] of fkChecks) {
        if (data[field] !== undefined && !hasValidForeignRow(db, table, data[field])) {
            return { ok: false, error: `${label} not found` }
        }
    }

    if (data.ship_to_facility_id !== undefined && data.customer_id !== undefined) {
        const facilityCustomerId = getFacilityCustomerId(db, data.ship_to_facility_id)
        if (facilityCustomerId === null) {
            return { ok: false, error: 'facility not found' }
        }
        if (Number(facilityCustomerId) !== Number(data.customer_id)) {
            return { ok: false, error: 'facility does not belong to customer' }
        }
    }

    return { ok: true }
}

export const createOrder = (db, data, actor = null) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'invalid payload' }

    const validation = validateOrderPayload(db, data, true)
    if (!validation.ok) return validation

    const now = Date.now()
    const snapshots = getSnapshotBundle(db, data)
    const payload = {
        ...data,
        ...snapshots,
        snapshot_created_at: now,
        created_at: now,
        updated_at: now,
        created_by: actor,
        updated_by: actor
    }

    const columns = Object.keys(payload)
    const placeholders = columns.map((key) => `:${key}`).join(', ')
    const sql = `INSERT INTO orders (${columns.join(', ')}) VALUES (${placeholders})`

    try {
        const info = db.prepare(sql).run(payload)
        return { ok: true, message: 'order created', id: info.lastInsertRowid }
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return { ok: false, error: 'order already exists' }
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) return { ok: false, error: `constraint error: ${err.message}` }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const updateOrder = (db, id, data, actor = null) => {
    if (!id) return { ok: false, error: 'id is required' }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'invalid payload' }
    const keys = Object.keys(data)
    if (keys.length === 0) return { ok: false, error: 'no data provided' }

    const validation = validateOrderPayload(db, data, false)
    if (!validation.ok) return validation

    const current = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
    if (!current) return { ok: false, error: 'order not found' }

    const merged = {
        ...current,
        ...data
    }

    if (
        data.ship_to_facility_id !== undefined ||
        data.customer_id !== undefined
    ) {
        const facilityCustomerId = getFacilityCustomerId(db, merged.ship_to_facility_id)
        if (facilityCustomerId === null) return { ok: false, error: 'facility not found' }
        if (Number(facilityCustomerId) !== Number(merged.customer_id)) {
            return { ok: false, error: 'facility does not belong to customer' }
        }
    }

    const payload = { ...data, updated_at: Date.now(), updated_by: actor }
    const payloadKeys = Object.keys(payload)
    const setClause = payloadKeys.map((key) => `${key} = :${key}`).join(', ')
    const sql = `UPDATE orders SET ${setClause} WHERE id = :id`

    try {
        const info = db.prepare(sql).run({ ...payload, id })
        return info.changes > 0 ? { ok: true, message: 'order updated' } : { ok: false, error: 'order not found' }
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return { ok: false, error: 'order already exists' }
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) return { ok: false, error: `constraint error: ${err.message}` }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const deleteOrder = (db, id) => {
    if (!id) return { ok: false, error: 'id is required' }
    try {
        const info = db.prepare('DELETE FROM orders WHERE id = ?').run(id)
        return info.changes > 0 ? { ok: true, message: 'order deleted' } : { ok: false, error: 'order not found' }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getOrderById = (db, id) => {
    if (!id) return { ok: false, error: 'id is required' }
    try {
        const data = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
        return data ? { ok: true, data } : { ok: false, error: 'order not found' }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getOrderByNumber = (db, order_number) => {
    if (!order_number) return { ok: false, error: 'order_number is required' }
    try {
        const data = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(order_number)
        return data ? { ok: true, data } : { ok: false, error: 'order not found' }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getAllOrders = (db) => {
    try {
        const data = db.prepare('SELECT * FROM orders ORDER BY order_received_date DESC, id DESC').all()
        return { ok: true, data }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}
