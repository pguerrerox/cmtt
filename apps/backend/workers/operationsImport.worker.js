import loadOperationsRows from '../helpers/excel_import/index.js'
import operationsFields from '../helpers/_OPERATIONS_MOLDS_FIELDS.js'
import { upsert as upsertOperationsPlan } from '../repositories/operations.repo.js'

/**
 * Operations import worker.
 *
 * Loads normalized rows from the Excel import helper and upserts operations
 * planned dates into the database.
 */

/**
 * Runs one operations import pass.
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite connection.
 * @param {{ loadRows?: () => Array<Record<string, unknown>>, sourceVersion?: string, refreshedAt?: number }} [options={}] - Worker options.
 * @returns {{ ok: boolean, processed: number, imported: number, skipped: number, failed: number, errors: string[] }} Import stats.
 */
export const runOperationsImportWorker = (db, options = {}) => {
  const loadRows = typeof options.loadRows === 'function' ? options.loadRows : loadOperationsRows
  const sourceVersion = options.sourceVersion ?? 'excel_import'
  const refreshedAt = Number.isFinite(options.refreshedAt) ? Math.trunc(options.refreshedAt) : Date.now()

  const stats = {
    ok: true,
    processed: 0,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: []
  }

  let rows
  try {
    rows = loadRows()
  } catch (err) {
    return {
      ...stats,
      ok: false,
      errors: [err.message]
    }
  }

  for (const row of rows) {
    stats.processed += 1

    const projectNumber = typeof row.project_number === 'string'
      ? row.project_number.trim()
      : row.project_number

    if (!projectNumber) {
      stats.skipped += 1
      continue
    }

    const payload = {
      project_number: projectNumber,
      source_version: sourceVersion,
      refreshed_at: refreshedAt
    }

    for (const field of operationsFields) {
      payload[field] = row[field] ?? null
    }

    const result = upsertOperationsPlan(db, payload)
    if (!result.ok) {
      stats.failed += 1
      stats.errors.push(`${projectNumber}: ${result.error}`)
      continue
    }

    if (result.changed === false) {
      stats.skipped += 1
      continue
    }

    stats.imported += 1
  }

  stats.ok = stats.failed === 0
  return stats
}
