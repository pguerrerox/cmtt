import { getOperationsPlan } from '../repositories/operations.repo.js'
import {
    getDueQueueItems,
    removeFromQueue,
    updateQueueEntry
} from '../repositories/operations-lookup-queue.repo.js'

/**
 * Operations lookup queue worker.
 *
 * Reconciles queued project lookups against operations data and updates queue status.
 */

/**
 * Default worker configuration resolved from environment variables.
 *
 * @type {{ batchSize: number, retryDelayMs: number, maxAttempts: number }}
 */
const defaultOptions = {
    batchSize: Number.parseInt(process.env.LOOKUP_BATCH_SIZE ?? '50', 10),
    retryDelayMs: Number.parseInt(process.env.LOOKUP_RETRY_DELAY_MS ?? '3600000', 10),
    maxAttempts: Number.parseInt(process.env.LOOKUP_MAX_ATTEMPTS ?? '8', 10)
}

/**
 * Returns a positive integer or a fallback value.
 *
 * @param {unknown} value - Candidate numeric value.
 * @param {number} fallback - Value used when `value` is invalid.
 * @returns {number} Positive integer.
 */
const toPositiveInteger = (value, fallback) => {
    if (Number.isInteger(value) && value > 0) return value
    return fallback
}

/**
 * Normalizes worker options with environment and hardcoded fallbacks.
 *
 * @param {{ batchSize?: number, retryDelayMs?: number, maxAttempts?: number, now?: number }} [options={}] - Runtime worker options.
 * @returns {{ batchSize: number, retryDelayMs: number, maxAttempts: number, now: number }} Sanitized worker options.
 */
const normalizeOptions = (options = {}) => ({
    batchSize: toPositiveInteger(options.batchSize, toPositiveInteger(defaultOptions.batchSize, 50)),
    retryDelayMs: toPositiveInteger(options.retryDelayMs, toPositiveInteger(defaultOptions.retryDelayMs, 3600000)),
    maxAttempts: toPositiveInteger(options.maxAttempts, toPositiveInteger(defaultOptions.maxAttempts, 8)),
    now: typeof options.now === 'number' && Number.isFinite(options.now)
        ? Math.trunc(options.now)
        : Date.now()
})

/**
 * Checks whether a projects-core row exists for project number.
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite connection.
 * @param {string} projectNumber - Project identifier to update.
 * @returns {boolean} `true` when a project row exists, otherwise `false`.
 */
const hasProjectCoreByNumber = (db, projectNumber) => {
    const row = db.prepare(`
        SELECT id
        FROM projects_core
        WHERE project_number = ?
        LIMIT 1
    `).get(projectNumber)
    return !!row
}

/**
 * Processes due queue entries and tries to enrich projects from operations data.
 *
 * The worker runs in a single transaction for the selected queue batch. When
 * operations data exists, the project is enriched and removed from queue. When
 * missing, the queue item is retried or marked as failed based on max attempts.
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite connection.
 * @param {{ batchSize?: number, retryDelayMs?: number, maxAttempts?: number, now?: number }} [options={}] - Runtime worker options.
 * @returns {{ ok: boolean, processed: number, enriched: number, retried: number, failed: number, removed: number, errors: string[] }} Worker execution stats.
 */
export const runOperationsLookupQueueWorker = (db, options = {}) => {
    const config = normalizeOptions(options)

    const stats = {
        ok: true,
        processed: 0,
        enriched: 0,
        retried: 0,
        failed: 0,
        removed: 0,
        errors: []
    }

    const dueItems = getDueQueueItems(db, config.now, config.batchSize)
    if (!dueItems.ok) {
        return {
            ...stats,
            ok: false,
            errors: [dueItems.error]
        }
    }

    const runInTx = db.transaction((rows) => {
        for (const row of rows) {
            stats.processed += 1
            const projectNumber = row.project_number
            const operationsResult = getOperationsPlan(db, {
                order_number: row.order_number,
                project_type: row.project_type,
                project_number: projectNumber
            })

            if (!operationsResult.ok && operationsResult.error !== 'operations plan not found') {
                throw new Error(operationsResult.error)
            }

            if (operationsResult.ok) {
                const updated = hasProjectCoreByNumber(db, projectNumber)
                if (!updated) {
                    const queueResult = updateQueueEntry(db, projectNumber, { status: 'failed' })
                    if (!queueResult.ok) throw new Error(queueResult.error)
                    stats.failed += 1
                    continue
                }

                const dequeueResult = removeFromQueue(db, projectNumber)
                if (!dequeueResult.ok) throw new Error(dequeueResult.error)
                stats.enriched += 1
                stats.removed += 1
                continue
            }

            const nextAttempts = row.attempts + 1
            const shouldFail = nextAttempts >= config.maxAttempts

            const retryUpdateResult = updateQueueEntry(db, projectNumber, {
                attempts: nextAttempts,
                last_attempt_date: config.now,
                next_attempt_date: shouldFail ? null : config.now + config.retryDelayMs,
                status: shouldFail ? 'failed' : 'pending'
            })

            if (!retryUpdateResult.ok) throw new Error(retryUpdateResult.error)

            if (shouldFail) {
                stats.failed += 1
            } else {
                stats.retried += 1
            }
        }
    })

    try {
        runInTx(dueItems.data)
        return stats
    }
    catch (err) {
        return {
            ...stats,
            ok: false,
            errors: [err.message]
        }
    }
}
