import allowedFields from '../helpers/_ALLOWED_PROJECT_ENGINEER_FIELDS.js'

export const createProjectEngineer = (db, data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, error: 'invalid payload' }
    }

    const keys = Object.keys(data)
    if (keys.length === 0) return { ok: false, error: 'no data provided' }

    const droppedKeys = keys.filter((key) => !allowedFields.includes(key))
    if (droppedKeys.length > 0) {
        return { ok: false, error: `invalid fields: ${droppedKeys.join(', ')}`, droppedKeys }
    }

    if (!data.fullname || (typeof data.fullname === 'string' && data.fullname.trim().length === 0)) {
        return { ok: false, error: 'fullname is required' }
    }

    const now = Date.now()
    const payload = { ...data, created_at: now, updated_at: now }
    const payloadKeys = Object.keys(payload)

    const columns = payloadKeys.join(', ')
    const placeholders = payloadKeys.map((key) => `:${key}`).join(', ')

    try {
        const stmt = db.prepare(`INSERT INTO project_engineers (${columns}) VALUES (${placeholders})`)
        stmt.run(payload)
        return { ok: true, message: 'project engineer created' }
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return { ok: false, error: 'project engineer already exists' }
        }
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
            return { ok: false, error: `constraint error: ${err.message}` }
        }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const updateProjectEngineer = (db, id, data) => {
    if (typeof id === 'string' && id.trim().length === 0) return { ok: false, error: 'id is required' }
    if (!id) return { ok: false, error: 'id is required' }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'invalid payload' }

    const keys = Object.keys(data)
    if (keys.length === 0) return { ok: false, error: 'no data provided' }

    const droppedKeys = keys.filter((key) => !allowedFields.includes(key))
    if (droppedKeys.length > 0) {
        return { ok: false, error: `invalid fields: ${droppedKeys.join(', ')}`, droppedKeys }
    }

    const payload = { ...data, updated_at: Date.now() }
    const payloadKeys = Object.keys(payload)
    const setClause = payloadKeys.map((key) => `${key} = :${key}`).join(', ')

    try {
        const stmt = db.prepare(`UPDATE project_engineers SET ${setClause} WHERE id = :id`)
        const info = stmt.run({ ...payload, id })
        return info.changes > 0 ? { ok: true, message: 'project engineer updated' } : { ok: false, error: 'project engineer not found' }
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return { ok: false, error: 'project engineer already exists' }
        }
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
            return { ok: false, error: `constraint error: ${err.message}` }
        }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const deleteProjectEngineer = (db, id) => {
    if (typeof id === 'string' && id.trim().length === 0) return { ok: false, error: 'id is required' }
    if (!id) return { ok: false, error: 'id is required' }

    try {
        const stmt = db.prepare('DELETE FROM project_engineers WHERE id = ?')
        const info = stmt.run(id)
        return info.changes > 0 ? { ok: true, message: 'project engineer deleted' } : { ok: false, error: 'project engineer not found' }
    } catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getAllProjectEngineers = (db) => {
    try {
        const data = db.prepare('SELECT * FROM project_engineers ORDER BY fullname ASC').all()
        return { ok: true, data }
    } catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getProjectEngineerById = (db, id) => {
    if (typeof id === 'string' && id.trim().length === 0) return { ok: false, error: 'id is required' }
    if (!id) return { ok: false, error: 'id is required' }

    try {
        const data = db.prepare('SELECT * FROM project_engineers WHERE id = ?').get(id)
        return data ? { ok: true, data } : { ok: false, error: 'project engineer not found' }
    } catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}
