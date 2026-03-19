function safeParseJson(value, fallback) {
    if (typeof value !== 'string') return fallback
    try {
        return JSON.parse(value)
    }
    catch {
        return fallback
    }
}

function parseRow(row) {
    if (!row) return null
    return {
        ...row,
        draft: safeParseJson(row.draft_json, {}),
        warnings: safeParseJson(row.warnings_json, []),
        errors: safeParseJson(row.errors_json, []),
        recommendations: safeParseJson(row.recommendations_json, [])
    }
}

export const createPsfScanResult = (db, data) => {
    const payload = {
        scan_job_id: data.scan_job_id,
        draft_json: JSON.stringify(data.draft ?? {}),
        warnings_json: JSON.stringify(data.warnings ?? []),
        errors_json: JSON.stringify(data.errors ?? []),
        recommendations_json: JSON.stringify(data.recommendations ?? []),
        fingerprint: data.fingerprint,
        created_at: Date.now()
    }

    const sql = `
        INSERT INTO psf_scan_results (
            scan_job_id, draft_json, warnings_json, errors_json,
            recommendations_json, fingerprint, created_at
        ) VALUES (
            :scan_job_id, :draft_json, :warnings_json, :errors_json,
            :recommendations_json, :fingerprint, :created_at
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

export const getLatestPsfScanResultByJobId = (db, scanJobId) => {
    if (!scanJobId) return { ok: false, error: 'scan_job_id is required' }
    try {
        const row = db
            .prepare('SELECT * FROM psf_scan_results WHERE scan_job_id = ? ORDER BY id DESC LIMIT 1')
            .get(scanJobId)
        return row ? { ok: true, data: parseRow(row) } : { ok: false, error: 'psf scan result not found' }
    }
    catch (err) {
        return { ok: false, error: `database error: ${err.message}` }
    }
}
