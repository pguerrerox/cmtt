function parseJobRow(row) {
    if (!row) return null
    return {
        ...row,
        parse_confidence: row.parse_confidence === null ? null : Number(row.parse_confidence)
    }
}

export const createPdfScanJob = (db, data) => {
    const now = Date.now()
    const payload = {
        uploaded_by: data.uploaded_by ?? null,
        original_filename: data.original_filename,
        mime_type: data.mime_type,
        file_size: Number(data.file_size ?? 0),
        status: data.status ?? 'processing',
        template_version: data.template_version ?? null,
        parse_confidence: data.parse_confidence ?? null,
        error_message: data.error_message ?? null,
        committed_order_id: data.committed_order_id ?? null,
        committed_at: data.committed_at ?? null,
        created_at: now,
        updated_at: now
    }

    const sql = `
        INSERT INTO pdf_scan_jobs (
            uploaded_by, original_filename, mime_type, file_size, status,
            template_version, parse_confidence, error_message,
            committed_order_id, committed_at, created_at, updated_at
        ) VALUES (
            :uploaded_by, :original_filename, :mime_type, :file_size, :status,
            :template_version, :parse_confidence, :error_message,
            :committed_order_id, :committed_at, :created_at, :updated_at
        )
    `

    try {
        const info = db.prepare(sql).run(payload)
        return { ok: true, id: info.lastInsertRowid }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const updatePdfScanJob = (db, id, patch) => {
    if (!id) return { ok: false, error: 'id is required' }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { ok: false, error: 'invalid payload' }

    const allowed = new Set([
        'status',
        'template_version',
        'parse_confidence',
        'error_message',
        'committed_order_id',
        'committed_at'
    ])

    const payload = {}
    for (const key of Object.keys(patch)) {
        if (allowed.has(key)) payload[key] = patch[key]
    }

    if (Object.keys(payload).length === 0) {
        return { ok: false, error: 'no data provided' }
    }

    payload.updated_at = Date.now()
    const keys = Object.keys(payload)
    const setClause = keys.map((key) => `${key} = :${key}`).join(', ')

    try {
        const info = db.prepare(`UPDATE pdf_scan_jobs SET ${setClause} WHERE id = :id`).run({ ...payload, id })
        return info.changes > 0 ? { ok: true, message: 'pdf scan job updated' } : { ok: false, error: 'pdf scan job not found' }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}

export const getPdfScanJobById = (db, id) => {
    if (!id) return { ok: false, error: 'id is required' }
    try {
        const row = db.prepare('SELECT * FROM pdf_scan_jobs WHERE id = ?').get(id)
        return row ? { ok: true, data: parseJobRow(row) } : { ok: false, error: 'pdf scan job not found' }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}
