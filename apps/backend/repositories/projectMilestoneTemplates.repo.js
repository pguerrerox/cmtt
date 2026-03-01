import allowedFields from '../helpers/_ALLOWED_PROJECT_MILESTONE_TEMPLATE_FIELDS.js'

const validProjectTypes = new Set([1, 2, 3])

function validatePayload(data, isCreate = true) {
    const keys = Object.keys(data)
    const droppedKeys = keys.filter((key) => !allowedFields.includes(key))
    if (droppedKeys.length > 0) {
        return { ok: false, error: `invalid fields: ${droppedKeys.join(', ')}`, droppedKeys }
    }

    if (isCreate) {
        const required = ['project_type', 'milestone_code', 'label', 'sequence']
        const missing = required.filter((field) => data[field] === undefined || data[field] === null || data[field] === '')
        if (missing.length > 0) return { ok: false, error: `missing required fields: ${missing.join(', ')}` }
    }

    if (data.project_type !== undefined && !validProjectTypes.has(Number(data.project_type))) {
        return { ok: false, error: 'invalid project_type' }
    }

    if (data.required !== undefined && ![0, 1].includes(Number(data.required))) {
        return { ok: false, error: 'invalid required' }
    }

    if (data.active !== undefined && ![0, 1].includes(Number(data.active))) {
        return { ok: false, error: 'invalid active' }
    }

    if (data.sequence !== undefined && (!Number.isInteger(Number(data.sequence)) || Number(data.sequence) < 1)) {
        return { ok: false, error: 'invalid sequence' }
    }

    return { ok: true }
}

export const createTemplateRow = (db, data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'invalid payload' }

    const validation = validatePayload(data, true)
    if (!validation.ok) return validation

    const now = Date.now()
    const payload = {
        ...data,
        required: data.required ?? 1,
        active: data.active ?? 1,
        template_version: data.template_version ?? 1,
        created_at: now,
        updated_at: now
    }

    const columns = Object.keys(payload)
    const placeholders = columns.map((key) => `:${key}`).join(', ')

    try {
        const info = db.prepare(`INSERT INTO project_milestone_templates (${columns.join(', ')}) VALUES (${placeholders})`).run(payload)
        return { ok: true, message: 'template row created', id: info.lastInsertRowid }
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return { ok: false, error: 'template row already exists' }
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) return { ok: false, error: `constraint error: ${err.message}` }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const updateTemplateRow = (db, id, data) => {
    if (!id) return { ok: false, error: 'id is required' }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'invalid payload' }
    if (Object.keys(data).length === 0) return { ok: false, error: 'no data provided' }

    const validation = validatePayload(data, false)
    if (!validation.ok) return validation

    const payload = { ...data, updated_at: Date.now() }
    const keys = Object.keys(payload)
    const setClause = keys.map((key) => `${key} = :${key}`).join(', ')

    try {
        const info = db.prepare(`UPDATE project_milestone_templates SET ${setClause} WHERE id = :id`).run({ ...payload, id })
        return info.changes > 0 ? { ok: true, message: 'template row updated' } : { ok: false, error: 'template row not found' }
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return { ok: false, error: 'template row already exists' }
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) return { ok: false, error: `constraint error: ${err.message}` }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const deleteTemplateRow = (db, id) => {
    if (!id) return { ok: false, error: 'id is required' }
    try {
        const info = db.prepare('DELETE FROM project_milestone_templates WHERE id = ?').run(id)
        return info.changes > 0 ? { ok: true, message: 'template row deleted' } : { ok: false, error: 'template row not found' }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const listTemplateByType = (db, project_type, template_version = 1, active = 1) => {
    if (!project_type) return { ok: false, error: 'project_type is required' }
    if (!validProjectTypes.has(Number(project_type))) return { ok: false, error: 'invalid project_type' }

    try {
        const data = db.prepare(`
            SELECT *
            FROM project_milestone_templates
            WHERE project_type = ?
              AND template_version = ?
              AND active = ?
            ORDER BY sequence ASC
        `).all(project_type, template_version, active)

        return { ok: true, data }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const cloneTemplateVersion = (db, project_type, fromVersion, toVersion) => {
    if (!validProjectTypes.has(Number(project_type))) return { ok: false, error: 'invalid project_type' }
    if (!Number.isInteger(Number(fromVersion)) || Number(fromVersion) < 1) return { ok: false, error: 'invalid fromVersion' }
    if (!Number.isInteger(Number(toVersion)) || Number(toVersion) < 1) return { ok: false, error: 'invalid toVersion' }

    const now = Date.now()
    const tx = db.transaction(() => {
        const rows = db.prepare(`
            SELECT project_type, milestone_code, label, sequence, required, active
            FROM project_milestone_templates
            WHERE project_type = ? AND template_version = ?
            ORDER BY sequence ASC
        `).all(project_type, fromVersion)

        if (rows.length === 0) {
            return { ok: false, error: 'source template not found' }
        }

        const stmt = db.prepare(`
            INSERT INTO project_milestone_templates (
                project_type, milestone_code, label, sequence, required, active,
                template_version, created_at, updated_at
            ) VALUES (
                :project_type, :milestone_code, :label, :sequence, :required, :active,
                :template_version, :created_at, :updated_at
            )
        `)

        for (const row of rows) {
            stmt.run({
                ...row,
                template_version: toVersion,
                created_at: now,
                updated_at: now
            })
        }

        return { ok: true, message: 'template version cloned' }
    })

    try {
        return tx()
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return { ok: false, error: 'target template version already exists' }
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) return { ok: false, error: `constraint error: ${err.message}` }
        return { ok: false, error: `database error: ${err.message}` }
    }
}
