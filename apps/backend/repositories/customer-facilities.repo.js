import allowedFields from '../helpers/_ALLOWED_CUSTOMER_FACILITY_FIELDS.js'

function customerExists(db, customerId) {
    if (customerId === null || customerId === undefined || customerId === '') return false
    const row = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId)
    return !!row
}

export const createCustomerFacility = (db, data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, error: 'invalid payload' }
    }

    const keys = Object.keys(data)
    if (keys.length === 0) return { ok: false, error: 'no data provided' }

    const droppedKeys = keys.filter((key) => !allowedFields.includes(key))
    if (droppedKeys.length > 0) {
        return { ok: false, error: `invalid fields: ${droppedKeys.join(', ')}`, droppedKeys }
    }

    if (!data.plant_name || (typeof data.plant_name === 'string' && data.plant_name.trim().length === 0)) {
        return { ok: false, error: 'plant_name is required' }
    }

    if (!data.plant_address || (typeof data.plant_address === 'string' && data.plant_address.trim().length === 0)) {
        return { ok: false, error: 'plant_address is required' }
    }

    if (!data.plant_contacts || (typeof data.plant_contacts === 'string' && data.plant_contacts.trim().length === 0)) {
        return { ok: false, error: 'plant_contacts is required' }
    }

    if (!customerExists(db, data.customer_id)) {
        return { ok: false, error: 'customer not found' }
    }

    const now = Date.now()
    const payload = { ...data, created_at: now, updated_at: now }
    const payloadKeys = Object.keys(payload)
    const columns = payloadKeys.join(', ')
    const placeholders = payloadKeys.map((key) => `:${key}`).join(', ')

    try {
        const stmt = db.prepare(`INSERT INTO customer_facilities (${columns}) VALUES (${placeholders})`)
        stmt.run(payload)
        return { ok: true, message: 'facility created' }
    } catch (err) {
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
            return { ok: false, error: `constraint error: ${err.message}` }
        }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const updateCustomerFacility = (db, id, data) => {
    if (typeof id === 'string' && id.trim().length === 0) return { ok: false, error: 'id is required' }
    if (!id) return { ok: false, error: 'id is required' }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'invalid payload' }

    const keys = Object.keys(data)
    if (keys.length === 0) return { ok: false, error: 'no data provided' }

    const droppedKeys = keys.filter((key) => !allowedFields.includes(key))
    if (droppedKeys.length > 0) {
        return { ok: false, error: `invalid fields: ${droppedKeys.join(', ')}`, droppedKeys }
    }

    if (data.customer_id !== undefined && !customerExists(db, data.customer_id)) {
        return { ok: false, error: 'customer not found' }
    }

    const payload = { ...data, updated_at: Date.now() }
    const payloadKeys = Object.keys(payload)
    const setClause = payloadKeys.map((key) => `${key} = :${key}`).join(', ')

    try {
        const stmt = db.prepare(`UPDATE customer_facilities SET ${setClause} WHERE id = :id`)
        const info = stmt.run({ ...payload, id })
        return info.changes > 0 ? { ok: true, message: 'facility updated' } : { ok: false, error: 'facility not found' }
    } catch (err) {
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
            return { ok: false, error: `constraint error: ${err.message}` }
        }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const deleteCustomerFacility = (db, id) => {
    if (typeof id === 'string' && id.trim().length === 0) return { ok: false, error: 'id is required' }
    if (!id) return { ok: false, error: 'id is required' }

    try {
        const stmt = db.prepare('DELETE FROM customer_facilities WHERE id = ?')
        const info = stmt.run(id)
        return info.changes > 0 ? { ok: true, message: 'facility deleted' } : { ok: false, error: 'facility not found' }
    } catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getAllCustomerFacilities = (db) => {
    try {
        const data = db.prepare(`
            SELECT customer_facilities.*, customers.name AS customer_name
            FROM customer_facilities
            JOIN customers ON customer_facilities.customer_id = customers.id
            ORDER BY customer_facilities.plant_name ASC
        `).all()
        return { ok: true, data }
    } catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getCustomerFacilityById = (db, id) => {
    if (typeof id === 'string' && id.trim().length === 0) return { ok: false, error: 'id is required' }
    if (!id) return { ok: false, error: 'id is required' }

    try {
        const data = db.prepare(`
            SELECT customer_facilities.*, customers.name AS customer_name
            FROM customer_facilities
            JOIN customers ON customer_facilities.customer_id = customers.id
            WHERE customer_facilities.id = ?
        `).get(id)
        return data ? { ok: true, data } : { ok: false, error: 'facility not found' }
    } catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}
