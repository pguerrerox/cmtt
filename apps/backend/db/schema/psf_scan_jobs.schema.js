/**
 * SQL schema for the `psf_scan_jobs` table.
 *
 * @type {string}
 */
export default `
CREATE TABLE IF NOT EXISTS psf_scan_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uploaded_by TEXT,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'scanned', 'failed', 'committed')),
    template_version TEXT,
    parse_confidence REAL,
    error_message TEXT,
    committed_order_id INTEGER,
    committed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (committed_order_id) REFERENCES orders(id) ON DELETE SET NULL
)`
