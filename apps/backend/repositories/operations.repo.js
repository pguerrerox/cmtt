import operationsFields from '../helpers/_OPERATIONS_MOLDS_FIELDS.js'

const OPERATIONS_TABLE = 'operations_mold_planned_dates'

/**
 * Operations repository.
 *
 * Stores and fetches mold planned operations dates keyed by `project_number`.
 */

const allowedFields = ['order_number', 'project_type', 'project_number', ...operationsFields, 'source_version', 'refreshed_at']
const integerDateFields = new Set([...operationsFields, 'refreshed_at'])

const toEpochFromSlashDate = (value) => {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
    if (!match) return null

    const month = Number(match[1])
    const day = Number(match[2])
    const yearPart = match[3]
    const year = yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart)

    if (!Number.isInteger(month) || !Number.isInteger(day) || !Number.isInteger(year)) return null
    if (month < 1 || month > 12 || day < 1 || day > 31) return null

    const parsed = new Date(year, month - 1, day)
    if (Number.isNaN(parsed.getTime())) return null

    return parsed.getTime()
}

/**
 * Normalizes a date-like value to an integer timestamp.
 *
 * @param {unknown} value - Candidate value.
 * @returns {number|null} Integer timestamp or `null` when invalid/empty.
 */
const toIntegerDate = (value) => {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) return null

        const slashDateEpoch = toEpochFromSlashDate(trimmed)
        if (slashDateEpoch !== null) return Math.trunc(slashDateEpoch)

        const numeric = Number(trimmed)
        if (Number.isFinite(numeric)) return Math.trunc(numeric)
    }
    return null
}

/**
     * Inserts or updates a mold operations plan row by project number.
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite connection.
 * @param {Record<string, unknown>} data - Operations payload with allowed fields.
 * @returns {{ ok: boolean, message?: string, error?: string, droppedKeys?: string[] }} Operation result.
 */
export const upsert = (db, data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, error: 'invalid payload' }
    }

    const keys = Object.keys(data)
    if (keys.length === 0) return { ok: false, error: 'no data provided' }

    const droppedKeys = keys.filter((key) => !allowedFields.includes(key))
    if (droppedKeys.length > 0) {
        return {
            ok: false,
            error: `invalid fields: ${droppedKeys.join(', ')}`,
            droppedKeys
        }
    }

    const hasProjectNumber = typeof data.project_number === 'string'
        ? data.project_number.trim().length > 0
        : !!data.project_number
    if (!hasProjectNumber) {
        return { ok: false, error: 'project_number is required' }
    }

    const payload = {
        ...data,
        refreshed_at: data.refreshed_at ?? Date.now()
    }

    for (const key of Object.keys(payload)) {
        if (integerDateFields.has(key)) {
            payload[key] = toIntegerDate(payload[key])
        }
    }

    if (payload.refreshed_at === null) {
        payload.refreshed_at = Date.now()
    }

    const columns = Object.keys(payload)
    const placeholders = columns.map((key) => `:${key}`).join(', ')
    const updateClause = columns
        .filter((key) => key !== 'project_number')
        .map((key) => `${key} = excluded.${key}`)
        .join(', ')

    const sql = `
        INSERT INTO ${OPERATIONS_TABLE} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT(project_number) DO UPDATE SET ${updateClause};
    `

    try {
        db.prepare(sql).run(payload)
        return { ok: true, message: 'operations plan upserted' }
    }
    catch (err) {
        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
            return { ok: false, error: `constraint error: ${err.message}` }
        }

        return { ok: false, error: `database error: ${err.message}` }
    }
}

/**
 * Returns mold operations data for one project number.
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite connection.
 * @param {string} project_number - Project identifier.
 * @returns {{ ok: boolean, data?: unknown, error?: string }} Query result.
 */
export const getOperationsPlanByProjectNumber = (db, project_number) => {
    if (typeof project_number === 'string' && project_number.trim().length === 0) {
        return { ok: false, error: 'project_number is required' }
    }
    if (!project_number) {
        return { ok: false, error: 'project_number is required' }
    }

    try {
        const operation = db.prepare(`
            SELECT * FROM ${OPERATIONS_TABLE} WHERE project_number = ?;
        `).get(project_number)

        return operation
            ? { ok: true, data: operation }
            : { ok: false, error: 'operations plan not found' }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

/**
 * Returns operations data using type-aware context.
 *
 * Lookup preference:
 * 1) project_number + project_type + order_number
 * 2) project_number + project_type
 * 3) project_number
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite connection.
 * @param {{ project_number: string, project_type?: number, order_number?: string }} context - Lookup context.
 * @returns {{ ok: boolean, data?: unknown, error?: string }} Query result.
 */
export const getOperationsPlan = (db, context) => {
    if (!context || typeof context !== 'object' || Array.isArray(context)) {
        return { ok: false, error: 'invalid payload' }
    }

    const projectNumber = context.project_number
    if (typeof projectNumber === 'string' && projectNumber.trim().length === 0) {
        return { ok: false, error: 'project_number is required' }
    }
    if (!projectNumber) {
        return { ok: false, error: 'project_number is required' }
    }

    try {
        let operation = null
        if (context.project_type !== undefined && context.order_number) {
            operation = db.prepare(`
                SELECT *
                FROM ${OPERATIONS_TABLE}
                WHERE project_number = ? AND project_type = ? AND order_number = ?
            `).get(projectNumber, context.project_type, context.order_number)
        }

        if (!operation && context.project_type !== undefined) {
            operation = db.prepare(`
                SELECT *
                FROM ${OPERATIONS_TABLE}
                WHERE project_number = ? AND project_type = ?
            `).get(projectNumber, context.project_type)
        }

        if (!operation) {
            operation = db.prepare(`
                SELECT *
                FROM ${OPERATIONS_TABLE}
                WHERE project_number = ?
            `).get(projectNumber)
        }

        return operation
            ? { ok: true, data: operation }
            : { ok: false, error: 'operations plan not found' }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}
