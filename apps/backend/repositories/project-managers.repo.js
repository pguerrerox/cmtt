import allowed_fields from '../helpers/_ALLOWED_PROJECT_MANAGER_FIELDS.js'
import managerRoles from '../helpers/_MANAGER_ROLES.js'

/**
 * Managers repository.
 *
 * Provides CRUD access for the `project_managers` table using a shared SQLite connection.
 */

/**
 * Inserts a manager record.
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite connection.
 * @param {Record<string, unknown>} data - Manager payload with allowed fields only.
 * @returns {{ ok: boolean, message?: string, error?: string, droppedKeys?: string[] }} Operation result.
 */
export const createProjectManager = (db, data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, error: 'invalid payload' };
    }

    const keys = Object.keys(data);
    if (keys.length === 0) return { ok: false, error: 'no data provided' };

    const droppedKeys = keys.filter((key) => !allowed_fields.includes(key));
    if (droppedKeys.length > 0) {
        return {
            ok: false,
            error: `invalid fields: ${droppedKeys.join(', ')}`,
            droppedKeys
        };
    }

    if (!managerRoles.includes(data.role)) {
        return {
            ok: false,
            error: `invalid role: must be one of ${managerRoles.join(', ')}`
        }
    }

    const now = Date.now()
    const payload = { ...data, created_at: now, updated_at: now }
    const payloadKeys = Object.keys(payload)

    const columns = payloadKeys.join(', ');
    const placeholders = payloadKeys.map((key) => `:${key}`).join(', ');
    const sql = `INSERT INTO project_managers (${columns}) VALUES (${placeholders})`;

    try {
        const stmt = db.prepare(sql);
        stmt.run(payload);
        return { ok: true, message: 'manager created' };
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return { ok: false, error: 'manager already exists' };
        }

        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
            return { ok: false, error: `constraint error: ${err.message}` };
        }

        return { ok: false, error: `database error: ${err.message}` };
    }
}

/**
 * Updates a manager record by id.
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite connection.
 * @param {number|string} id - Manager primary key.
 * @param {Record<string, unknown>} data - Partial manager payload with allowed fields.
 * @returns {{ ok: boolean, message?: string, error?: string, droppedKeys?: string[] }} Operation result.
 */
export const updateProjectManager = (db, id, data) => {
    if (typeof id === 'string' && id.trim().length === 0) {
        return { ok: false, error: 'id is required' };
    }
    if (!id) {
        return { ok: false, error: 'id is required' };
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, error: 'invalid payload' };
    }

    const keys = Object.keys(data);
    if (keys.length === 0) return { ok: false, error: 'no data provided' };

    const droppedKeys = keys.filter((key) => !allowed_fields.includes(key));
    if (droppedKeys.length > 0) {
        return {
            ok: false,
            error: `invalid fields: ${droppedKeys.join(', ')}`,
            droppedKeys
        };
    }

    if (data.role !== undefined && !managerRoles.includes(data.role)) {
        return {
            ok: false,
            error: `invalid role: must be one of ${managerRoles.join(', ')}`
        }
    }

    const payload = { ...data, updated_at: Date.now() }
    const payloadKeys = Object.keys(payload)
    const setClause = payloadKeys.map((key) => `${key} = :${key}`).join(', ');
    const sql = `UPDATE project_managers SET ${setClause} WHERE id = :id`;

    try {
        const stmt = db.prepare(sql);
        const info = stmt.run({ ...payload, id });
        return info.changes > 0
            ? { ok: true, message: 'manager updated' }
            : { ok: false, error: 'manager not found' };
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return { ok: false, error: 'manager already exists' };
        }

        if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
            return { ok: false, error: `constraint error: ${err.message}` };
        }

        return { ok: false, error: `database error: ${err.message}` };
    }
}

/**
 * Deletes a manager record by id.
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite connection.
 * @param {number|string} id - Manager primary key.
 * @returns {{ ok: boolean, message?: string, error?: string }} Operation result.
 */
export const deleteProjectManager = (db, id) => {
    if (typeof id === 'string' && id.trim().length === 0) {
        return { ok: false, error: 'id is required' };
    }
    if (!id) {
        return { ok: false, error: 'id is required' };
    }

    try {
        const stmt = db.prepare(`DELETE FROM project_managers WHERE id = ?`);
        const info = stmt.run(id);
        return info.changes > 0
            ? { ok: true, message: 'manager deleted' }
            : { ok: false, error: 'manager not found' };
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` };
    }
}

/**
 * Returns all managers ordered by full name.
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite connection.
 * @returns {{ ok: boolean, data?: unknown[], error?: string }} Query result.
 */
export const getAllProjectManagers = (db) => {
    try {
        const managers = db.prepare(`SELECT * FROM project_managers ORDER BY fullname ASC`).all();
        return { ok: true, data: managers };
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` };
    }
}

/**
 * Returns a manager by username.
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite connection.
 * @param {string} name - Manager username.
 * @returns {{ ok: boolean, data?: unknown, error?: string }} Query result.
 */
export const getProjectManagerByUsername = (db, name) => {
    if (typeof name === 'string' && name.trim().length === 0) {
        return { ok: false, error: 'name is required' };
    }
    if (!name) {
        return { ok: false, error: 'name is required' };
    }

    try {
        const manager = db.prepare(`SELECT * FROM project_managers WHERE username = ?`).get(name);
        return manager
            ? { ok: true, data: manager }
            : { ok: false, error: 'manager not found' };
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` };
    }
}

/**
 * Returns a manager by id.
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite connection.
 * @param {number|string} id - Manager primary key.
 * @returns {{ ok: boolean, data?: unknown, error?: string }} Query result.
 */
export const getProjectManagerById = (db, id) => {
    if (typeof id === 'string' && id.trim().length === 0) {
        return { ok: false, error: 'id is required' };
    }
    if (!id) {
        return { ok: false, error: 'id is required' };
    }

    try {
        const manager = db.prepare(`SELECT * FROM project_managers WHERE id = ?`).get(id);
        return manager
            ? { ok: true, data: manager }
            : { ok: false, error: 'manager not found' };
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` };
    }
}
