import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import {
    enqueueProject,
    getDueQueueItems,
    getProjectByNumber,
    getAllQueue,
    removeFromQueue,
    updateQueueEntry
} from '../../repositories/operations-lookup-queue.repo.js'

test('enqueueProject inserts a pending queue record', () => {
    const db = createTestDb()

    const result = enqueueProject(db, 'P-6000')
    assert.equal(result.ok, true)

    const fetched = getProjectByNumber(db, 'P-6000')
    assert.equal(fetched.ok, true)
    assert.equal(fetched.data.status, 'pending')
    assert.equal(fetched.data.attempts, 0)
    assert.equal(typeof fetched.data.created_at, 'number')
    assert.equal(typeof fetched.data.updated_at, 'number')
})

test('enqueueProject is idempotent by project_number', () => {
    const db = createTestDb()

    enqueueProject(db, 'P-6001')
    enqueueProject(db, 'P-6001', { status: 'failed' })

    const rows = getAllQueue(db)
    assert.equal(rows.ok, true)
    assert.equal(rows.data.length, 1)
    assert.equal(rows.data[0].status, 'failed')
})

test('enqueueProject normalizes next/last attempt dates to integers', () => {
    const db = createTestDb()

    const result = enqueueProject(db, 'P-6002', {
        last_attempt_date: '1700000000000',
        next_attempt_date: 1700003600000
    })
    assert.equal(result.ok, true)

    const fetched = getProjectByNumber(db, 'P-6002')
    assert.equal(fetched.ok, true)
    assert.equal(fetched.data.last_attempt_date, 1700000000000)
    assert.equal(fetched.data.next_attempt_date, 1700003600000)
})

test('getProjectByNumber returns not found when absent', () => {
    const db = createTestDb()
    const missing = getProjectByNumber(db, 'none')
    assert.equal(missing.ok, false)
    assert.equal(missing.error, 'project not found in queue')
})

test('getDueQueueItems returns only due pending rows', () => {
    const db = createTestDb()

    enqueueProject(db, 'P-7000', { next_attempt_date: 900 })
    enqueueProject(db, 'P-7001', { next_attempt_date: 1200 })
    enqueueProject(db, 'P-7002', { status: 'failed', next_attempt_date: 800 })

    const due = getDueQueueItems(db, 1000, 50)
    assert.equal(due.ok, true)
    assert.equal(due.data.length, 1)
    assert.equal(due.data[0].project_number, 'P-7000')
})

test('updateQueueEntry updates queue counters and status', () => {
    const db = createTestDb()

    enqueueProject(db, 'P-7003')
    const updated = updateQueueEntry(db, 'P-7003', {
        attempts: 3,
        status: 'pending',
        last_attempt_date: 1700000000000,
        next_attempt_date: 1700003600000
    })

    assert.equal(updated.ok, true)

    const fetched = getProjectByNumber(db, 'P-7003')
    assert.equal(fetched.ok, true)
    assert.equal(fetched.data.attempts, 3)
    assert.equal(fetched.data.last_attempt_date, 1700000000000)
    assert.equal(fetched.data.next_attempt_date, 1700003600000)
})

test('removeFromQueue deletes an existing queue row', () => {
    const db = createTestDb()

    enqueueProject(db, 'P-7004')
    const removed = removeFromQueue(db, 'P-7004')

    assert.equal(removed.ok, true)

    const fetched = getProjectByNumber(db, 'P-7004')
    assert.equal(fetched.ok, false)
    assert.equal(fetched.error, 'project not found in queue')
})
