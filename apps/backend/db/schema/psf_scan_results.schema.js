/**
 * SQL schema for the `psf_scan_results` table.
 *
 * @type {string}
 */
export default `
CREATE TABLE IF NOT EXISTS psf_scan_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_job_id INTEGER NOT NULL,
    draft_json TEXT NOT NULL,
    warnings_json TEXT NOT NULL,
    errors_json TEXT NOT NULL,
    recommendations_json TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (scan_job_id) REFERENCES psf_scan_jobs(id) ON DELETE CASCADE
)`
