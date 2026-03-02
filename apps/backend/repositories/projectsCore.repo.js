import allowedFields from '../helpers/_ALLOWED_PROJECT_CORE_FIELDS.js'
import { getOrderById } from './orders.repo.js'
import { seedMilestonesFromTemplate, listMilestonesByProject } from './projectMilestones.repo.js'
import { runProjectEnrichment } from '../services/enrichment.service.js'

const validTypes = new Set([1, 2, 3])
const validCreditStatus = new Set([1, 2, 3])
const validStatuses = new Set(['New', 'Ordered', 'Internal', 'Kicked', 'Packed', 'Shipped', 'Cancelled'])

function validatePayload(data, isCreate = true) {
    const keys = Object.keys(data)
    const droppedKeys = keys.filter((key) => !allowedFields.includes(key))
    if (droppedKeys.length > 0) {
        return { ok: false, error: `invalid fields: ${droppedKeys.join(', ')}`, droppedKeys }
    }

    if (isCreate) {
        const required = ['order_id', 'project_number', 'project_description', 'type']
        const missing = required.filter((field) => data[field] === undefined || data[field] === null || data[field] === '')
        if (missing.length > 0) return { ok: false, error: `missing required fields: ${missing.join(', ')}` }
    }

    if (data.type !== undefined && !validTypes.has(Number(data.type))) return { ok: false, error: 'invalid type' }
    if (data.credit_status !== undefined && !validCreditStatus.has(Number(data.credit_status))) return { ok: false, error: 'invalid credit_status' }
    if (data.status !== undefined && !validStatuses.has(data.status)) return { ok: false, error: 'invalid status' }

    return { ok: true }
}

export const createProjectCore = (db, data, actor = null) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'invalid payload' }

    const validation = validatePayload(data, true)
    if (!validation.ok) return validation

    const orderResult = getOrderById(db, data.order_id)
    if (!orderResult.ok) return { ok: false, error: 'order not found' }

    const now = Date.now()
    const payload = {
        ...data,
        credit_status: data.credit_status ?? 1,
        status: data.status ?? 'New',
        snapshot_order_number: orderResult.data.order_number,
        snapshot_project_type: data.type,
        snapshot_status: data.status ?? 'New',
        snapshot_created_at: now,
        created_at: now,
        updated_at: now,
        created_by: actor,
        updated_by: actor
    }

    const columns = Object.keys(payload)
    const placeholders = columns.map((key) => `:${key}`).join(', ')

    const insertProject = db.prepare(`INSERT INTO projects_core (${columns.join(', ')}) VALUES (${placeholders})`)

    const tx = db.transaction(() => {
        const info = insertProject.run(payload)
        const projectId = info.lastInsertRowid

        const seedResult = seedMilestonesFromTemplate(db, projectId, payload.type, 1, actor)
        if (!seedResult.ok) throw new Error(seedResult.error)

        const enrichResult = runProjectEnrichment(db, {
            projectId,
            orderId: payload.order_id,
            orderNumber: orderResult.data.order_number,
            projectNumber: payload.project_number,
            projectType: payload.type
        })
        if (!enrichResult.ok) throw new Error(enrichResult.error)

        return {
            ok: true,
            message: 'project created',
            id: projectId,
            lookup_status: enrichResult.lookup_status
        }
    })

    try {
        return tx()
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return { ok: false, error: 'project already exists' }
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) return { ok: false, error: `constraint error: ${err.message}` }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const updateProjectCore = (db, id, data, actor = null) => {
    if (!id) return { ok: false, error: 'id is required' }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'invalid payload' }
    if (Object.keys(data).length === 0) return { ok: false, error: 'no data provided' }

    const validation = validatePayload(data, false)
    if (!validation.ok) return validation

    if (data.order_id !== undefined || data.project_number !== undefined || data.type !== undefined) {
        return { ok: false, error: 'order_id, project_number, and type cannot be updated' }
    }

    const payload = { ...data, updated_at: Date.now(), updated_by: actor }
    const keys = Object.keys(payload)
    const setClause = keys.map((key) => `${key} = :${key}`).join(', ')

    try {
        const info = db.prepare(`UPDATE projects_core SET ${setClause} WHERE id = :id`).run({ ...payload, id })
        return info.changes > 0 ? { ok: true, message: 'project updated' } : { ok: false, error: 'project not found' }
    }
    catch (err) {
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) return { ok: false, error: `constraint error: ${err.message}` }
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const deleteProjectCore = (db, id) => {
    if (!id) return { ok: false, error: 'id is required' }
    try {
        const info = db.prepare('DELETE FROM projects_core WHERE id = ?').run(id)
        return info.changes > 0 ? { ok: true, message: 'project deleted' } : { ok: false, error: 'project not found' }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getProjectCoreById = (db, id) => {
    if (!id) return { ok: false, error: 'id is required' }
    try {
        const data = db.prepare(`
            SELECT
                projects_core.*,
                orders.order_number
            FROM projects_core
            JOIN orders ON projects_core.order_id = orders.id
            WHERE projects_core.id = ?
        `).get(id)

        if (!data) return { ok: false, error: 'project not found' }

        const milestones = listMilestonesByProject(db, id)
        return {
            ok: true,
            data: {
                ...data,
                milestones: milestones.ok ? milestones.data : []
            }
        }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getProjectsByOrderId = (db, order_id) => {
    if (!order_id) return { ok: false, error: 'order_id is required' }
    try {
        const data = db.prepare(`
            SELECT *
            FROM projects_core
            WHERE order_id = ?
            ORDER BY created_at DESC, id DESC
        `).all(order_id)
        return { ok: true, data }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getProjectCoreByNumberInOrder = (db, order_id, project_number) => {
    if (!order_id) return { ok: false, error: 'order_id is required' }
    if (!project_number) return { ok: false, error: 'project_number is required' }
    try {
        const data = db.prepare(`
            SELECT *
            FROM projects_core
            WHERE order_id = ? AND project_number = ?
        `).get(order_id, project_number)
        return data ? { ok: true, data } : { ok: false, error: 'project not found' }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}
