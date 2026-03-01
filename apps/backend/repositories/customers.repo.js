import allowedFields from '../helpers/_ALLOWED_CUSTOMER_FIELDS.js'

function hasValidForeignRow(db, table, id) {
    if (id === null || id === undefined || id === '') return true
    const row = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id)
    return !!row
}

export const createCustomer = (db, data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, error: 'invalid payload' }
    }

    const keys = Object.keys(data)
    if (keys.length === 0) return { ok: false, error: 'no data provided' }

    const droppedKeys = keys.filter((key) => !allowedFields.includes(key))
    if (droppedKeys.length > 0) {
        return { ok: false, error: `invalid fields: ${droppedKeys.join(', ')}`, droppedKeys }
    }

    if (!data.name || (typeof data.name === 'string' && data.name.trim().length === 0)) {
        return { ok: false, error: 'name is required' }
    }

    if (!data.headquarters_address || (typeof data.headquarters_address === 'string' && data.headquarters_address.trim().length === 0)) {
        return { ok: false, error: 'headquarters_address is required' }
    }

    if (!data.headquarter_contacts || (typeof data.headquarter_contacts === 'string' && data.headquarter_contacts.trim().length === 0)) {
        return { ok: false, error: 'headquarter_contacts is required' }
    }

    if (data.project_manager_id === null || data.project_manager_id === undefined || data.project_manager_id === '') {
        return { ok: false, error: 'project_manager_id is required' }
    }

    if (data.sales_manager_id === null || data.sales_manager_id === undefined || data.sales_manager_id === '') {
        return { ok: false, error: 'sales_manager_id is required' }
    }

    if (data.project_engineer_id === null || data.project_engineer_id === undefined || data.project_engineer_id === '') {
        return { ok: false, error: 'project_engineer_id is required' }
    }

    if (!hasValidForeignRow(db, 'project_managers', data.project_manager_id)) {
        return { ok: false, error: 'project manager not found' }
    }

    if (!hasValidForeignRow(db, 'sales_managers', data.sales_manager_id)) {
        return { ok: false, error: 'sales manager not found' }
    }

    if (!hasValidForeignRow(db, 'project_engineers', data.project_engineer_id)) {
        return { ok: false, error: 'project engineer not found' }
    }

    const now = Date.now()
    const payload = { ...data, created_at: now, updated_at: now }
    const payloadKeys = Object.keys(payload)
    const columns = payloadKeys.join(', ')
    const placeholders = payloadKeys.map((key) => `:${key}`).join(', ')

    try {
        const stmt = db.prepare(`INSERT INTO customers (${columns}) VALUES (${placeholders})`)
        stmt.run(payload)
        return { ok: true, message: 'customer created' }
    } catch (err) {
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
            return { ok: false, error: `constraint error: ${err.message}` }
        }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const updateCustomer = (db, id, data) => {
    if (typeof id === 'string' && id.trim().length === 0) return { ok: false, error: 'id is required' }
    if (!id) return { ok: false, error: 'id is required' }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'invalid payload' }

    const keys = Object.keys(data)
    if (keys.length === 0) return { ok: false, error: 'no data provided' }

    const droppedKeys = keys.filter((key) => !allowedFields.includes(key))
    if (droppedKeys.length > 0) {
        return { ok: false, error: `invalid fields: ${droppedKeys.join(', ')}`, droppedKeys }
    }

    if (data.project_manager_id !== undefined && !hasValidForeignRow(db, 'project_managers', data.project_manager_id)) {
        return { ok: false, error: 'project manager not found' }
    }

    if (data.sales_manager_id !== undefined && !hasValidForeignRow(db, 'sales_managers', data.sales_manager_id)) {
        return { ok: false, error: 'sales manager not found' }
    }

    if (data.project_engineer_id !== undefined && !hasValidForeignRow(db, 'project_engineers', data.project_engineer_id)) {
        return { ok: false, error: 'project engineer not found' }
    }

    const payload = { ...data, updated_at: Date.now() }
    const payloadKeys = Object.keys(payload)
    const setClause = payloadKeys.map((key) => `${key} = :${key}`).join(', ')

    try {
        const stmt = db.prepare(`UPDATE customers SET ${setClause} WHERE id = :id`)
        const info = stmt.run({ ...payload, id })
        return info.changes > 0 ? { ok: true, message: 'customer updated' } : { ok: false, error: 'customer not found' }
    } catch (err) {
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
            return { ok: false, error: `constraint error: ${err.message}` }
        }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const deleteCustomer = (db, id) => {
    if (typeof id === 'string' && id.trim().length === 0) return { ok: false, error: 'id is required' }
    if (!id) return { ok: false, error: 'id is required' }

    try {
        const stmt = db.prepare('DELETE FROM customers WHERE id = ?')
        const info = stmt.run(id)
        return info.changes > 0 ? { ok: true, message: 'customer deleted' } : { ok: false, error: 'customer not found' }
    } catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getAllCustomers = (db) => {
    try {
        const data = db.prepare(`
            SELECT
                customers.*,
                project_managers.fullname AS project_manager_name,
                sales_managers.fullname AS sales_manager_name,
                project_engineers.fullname AS project_engineer_name
            FROM customers
            LEFT JOIN project_managers ON customers.project_manager_id = project_managers.id
            LEFT JOIN sales_managers ON customers.sales_manager_id = sales_managers.id
            LEFT JOIN project_engineers ON customers.project_engineer_id = project_engineers.id
            ORDER BY customers.name ASC
        `).all()
        return { ok: true, data }
    } catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getCustomerById = (db, id) => {
    if (typeof id === 'string' && id.trim().length === 0) return { ok: false, error: 'id is required' }
    if (!id) return { ok: false, error: 'id is required' }

    try {
        const data = db.prepare(`
            SELECT
                customers.*,
                project_managers.fullname AS project_manager_name,
                sales_managers.fullname AS sales_manager_name,
                project_engineers.fullname AS project_engineer_name
            FROM customers
            LEFT JOIN project_managers ON customers.project_manager_id = project_managers.id
            LEFT JOIN sales_managers ON customers.sales_manager_id = sales_managers.id
            LEFT JOIN project_engineers ON customers.project_engineer_id = project_engineers.id
            WHERE customers.id = ?
        `).get(id)
        return data ? { ok: true, data } : { ok: false, error: 'customer not found' }
    } catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}
