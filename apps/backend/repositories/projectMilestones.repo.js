import allowedFields from '../helpers/_ALLOWED_PROJECT_MILESTONE_FIELDS.js'
import { listTemplateByType } from './projectMilestoneTemplates.repo.js'

const allowedStatuses = new Set(['pending', 'ready', 'in_progress', 'done', 'blocked', 'cancelled'])

function projectExists(db, projectId) {
    const row = db.prepare('SELECT id FROM projects_core WHERE id = ?').get(projectId)
    return !!row
}

function validateMilestonePayload(db, data, isCreate = true) {
    const keys = Object.keys(data)
    const droppedKeys = keys.filter((key) => !allowedFields.includes(key))
    if (droppedKeys.length > 0) {
        return { ok: false, error: `invalid fields: ${droppedKeys.join(', ')}`, droppedKeys }
    }

    if (isCreate) {
        const required = ['project_id', 'milestone_code', 'sequence']
        const missing = required.filter((field) => data[field] === undefined || data[field] === null || data[field] === '')
        if (missing.length > 0) return { ok: false, error: `missing required fields: ${missing.join(', ')}` }
    }

    if (data.project_id !== undefined && !projectExists(db, data.project_id)) {
        return { ok: false, error: 'project not found' }
    }

    if (data.required !== undefined && ![0, 1].includes(Number(data.required))) {
        return { ok: false, error: 'invalid required' }
    }

    if (data.milestone_status !== undefined && !allowedStatuses.has(data.milestone_status)) {
        return { ok: false, error: 'invalid milestone_status' }
    }

    return { ok: true }
}

export const createMilestoneRow = (db, data, actor = null) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'invalid payload' }

    const validation = validateMilestonePayload(db, data, true)
    if (!validation.ok) return validation

    const now = Date.now()
    const payload = {
        ...data,
        required: data.required ?? 1,
        milestone_status: data.milestone_status ?? 'pending',
        template_version: data.template_version ?? 1,
        created_at: now,
        updated_at: now,
        created_by: actor,
        updated_by: actor
    }

    const keys = Object.keys(payload)
    const placeholders = keys.map((key) => `:${key}`).join(', ')

    try {
        const info = db.prepare(`INSERT INTO project_milestones (${keys.join(', ')}) VALUES (${placeholders})`).run(payload)
        return { ok: true, message: 'milestone created', id: info.lastInsertRowid }
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return { ok: false, error: 'milestone already exists' }
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) return { ok: false, error: `constraint error: ${err.message}` }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const updateMilestoneRow = (db, id, data, actor = null) => {
    if (!id) return { ok: false, error: 'id is required' }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'invalid payload' }
    if (Object.keys(data).length === 0) return { ok: false, error: 'no data provided' }

    const validation = validateMilestonePayload(db, data, false)
    if (!validation.ok) return validation

    if (data.project_id !== undefined || data.milestone_code !== undefined || data.sequence !== undefined) {
        return { ok: false, error: 'project_id, milestone_code, and sequence cannot be updated' }
    }

    const payload = { ...data, updated_at: Date.now(), updated_by: actor }
    const keys = Object.keys(payload)
    const setClause = keys.map((key) => `${key} = :${key}`).join(', ')

    try {
        const info = db.prepare(`UPDATE project_milestones SET ${setClause} WHERE id = :id`).run({ ...payload, id })
        return info.changes > 0 ? { ok: true, message: 'milestone updated' } : { ok: false, error: 'milestone not found' }
    }
    catch (err) {
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) return { ok: false, error: `constraint error: ${err.message}` }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const upsertMilestoneByProjectAndCode = (db, project_id, milestone_code, patch = {}, actor = null) => {
    if (!project_id) return { ok: false, error: 'project_id is required' }
    if (!milestone_code) return { ok: false, error: 'milestone_code is required' }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { ok: false, error: 'invalid payload' }

    const existing = db.prepare('SELECT * FROM project_milestones WHERE project_id = ? AND milestone_code = ?').get(project_id, milestone_code)
    if (!existing) return { ok: false, error: 'milestone not found' }

    return updateMilestoneRow(db, existing.id, patch, actor)
}

export const listMilestonesByProject = (db, project_id) => {
    if (!project_id) return { ok: false, error: 'project_id is required' }
    try {
        const data = db.prepare(`
            SELECT *
            FROM project_milestones
            WHERE project_id = ?
            ORDER BY sequence ASC
        `).all(project_id)
        return { ok: true, data }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const deleteMilestoneRow = (db, id) => {
    if (!id) return { ok: false, error: 'id is required' }
    try {
        const info = db.prepare('DELETE FROM project_milestones WHERE id = ?').run(id)
        return info.changes > 0 ? { ok: true, message: 'milestone deleted' } : { ok: false, error: 'milestone not found' }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const seedMilestonesFromTemplate = (db, project_id, project_type, template_version = 1, actor = null) => {
    if (!project_id) return { ok: false, error: 'project_id is required' }
    if (!project_type) return { ok: false, error: 'project_type is required' }
    if (!projectExists(db, project_id)) return { ok: false, error: 'project not found' }

    const templateResult = listTemplateByType(db, project_type, template_version, 1)
    if (!templateResult.ok) return templateResult
    if (templateResult.data.length === 0) return { ok: true, message: 'no active template rows', inserted: 0 }

    const now = Date.now()
    const insert = db.prepare(`
        INSERT INTO project_milestones (
            project_id,
            milestone_code,
            sequence,
            required,
            milestone_status,
            template_version,
            created_at,
            updated_at,
            created_by,
            updated_by
        ) VALUES (
            :project_id,
            :milestone_code,
            :sequence,
            :required,
            'pending',
            :template_version,
            :created_at,
            :updated_at,
            :created_by,
            :updated_by
        )
        ON CONFLICT(project_id, milestone_code) DO NOTHING
    `)

    let inserted = 0
    const tx = db.transaction(() => {
        for (const row of templateResult.data) {
            const info = insert.run({
                project_id,
                milestone_code: row.milestone_code,
                sequence: row.sequence,
                required: row.required,
                template_version: row.template_version,
                created_at: now,
                updated_at: now,
                created_by: actor,
                updated_by: actor
            })
            if (info.changes > 0) inserted += 1
        }
    })

    try {
        tx()
        return { ok: true, message: 'milestones seeded', inserted }
    }
    catch (err) {
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) return { ok: false, error: `constraint error: ${err.message}` }
        return { ok: false, error: `database error: ${err.message}` }
    }
}
