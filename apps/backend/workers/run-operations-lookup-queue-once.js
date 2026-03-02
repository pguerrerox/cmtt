import db from '../db/db.js'
import { runOperationsLookupQueueWorker } from './operations-lookup-queue.worker.js'

/**
 * One-shot worker entrypoint for queue reconciliation.
 */

/**
 * Runs one operations lookup queue worker pass and emits a JSON summary.
 *
 * Side effects: reads/writes database rows, writes to stdout/stderr, and sets
 * `process.exitCode` to `1` when execution fails.
 */
const result = runOperationsLookupQueueWorker(db)

if (!result.ok) {
    console.error(JSON.stringify({
        message: 'operations lookup queue worker failed',
        errors: result.errors
    }))
    process.exitCode = 1
} else {
    console.log(JSON.stringify({
        message: 'operations lookup queue worker completed',
        processed: result.processed,
        enriched: result.enriched,
        retried: result.retried,
        failed: result.failed,
        removed: result.removed
    }))
}
