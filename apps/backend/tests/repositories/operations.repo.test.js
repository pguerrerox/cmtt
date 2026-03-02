import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import {
    upsert,
    getOperationsPlanByProjectNumber
} from '../../repositories/operations.repo.js'

test('upsert inserts operations planned dates for a project', () => {
    const db = createTestDb()

    const result = upsert(db, {
        project_number: 'P-5000',
        kickoff_date_planned: 1760918400000,
        ship_date_planned: 1763510400000,
        source_version: 'v1'
    })

    assert.equal(result.ok, true)
    assert.equal(result.changed, true)

    const fetched = getOperationsPlanByProjectNumber(db, 'P-5000')
    assert.equal(fetched.ok, true)
    assert.equal(fetched.data.ship_date_planned, 1763510400000)
    assert.equal(fetched.data.source_version, 'v1')
    assert.equal(typeof fetched.data.refreshed_at, 'number')
})

test('upsert updates existing operations row by project_number', () => {
    const db = createTestDb()

    upsert(db, {
        project_number: 'P-5001',
        ship_date_planned: 1763510400000,
        source_version: 'v1'
    })
    const updated = upsert(db, {
        project_number: 'P-5001',
        ship_date_planned: 1775347200000,
        source_version: 'v2'
    })

    assert.equal(updated.ok, true)
    assert.equal(updated.changed, true)

    const fetched = getOperationsPlanByProjectNumber(db, 'P-5001')
    assert.equal(fetched.data.ship_date_planned, 1775347200000)
    assert.equal(fetched.data.source_version, 'v2')
})

test('upsert parses slash-formatted date strings from import data', () => {
    const db = createTestDb()

    const result = upsert(db, {
        project_number: 'P-5002',
        kickoff_date_planned: '05/08/2017',
        ship_date_planned: '07/27/2018',
        source_version: 'excel-import'
    })

    assert.equal(result.ok, true)
    assert.equal(result.changed, true)

    const fetched = getOperationsPlanByProjectNumber(db, 'P-5002')
    assert.equal(fetched.ok, true)
    assert.equal(typeof fetched.data.kickoff_date_planned, 'number')
    assert.equal(typeof fetched.data.ship_date_planned, 'number')
    assert.notEqual(fetched.data.kickoff_date_planned, null)
    assert.notEqual(fetched.data.ship_date_planned, null)
})

test('upsert stores null for invalid date strings', () => {
    const db = createTestDb()

    const result = upsert(db, {
        project_number: 'P-5003',
        kickoff_date_planned: 'NOT_A_DATE',
        source_version: 'excel-import'
    })

    assert.equal(result.ok, true)
    assert.equal(result.changed, true)

    const fetched = getOperationsPlanByProjectNumber(db, 'P-5003')
    assert.equal(fetched.ok, true)
    assert.equal(fetched.data.kickoff_date_planned, null)
})

test('getOperationsPlanByProjectNumber returns not found when missing', () => {
    const db = createTestDb()
    const result = getOperationsPlanByProjectNumber(db, 'missing')
    assert.equal(result.ok, false)
    assert.equal(result.error, 'operations plan not found')
})

test('upsert reports unchanged when incoming data matches existing row', () => {
    const db = createTestDb()

    const first = upsert(db, {
        project_number: 'P-5004',
        project_type: 3,
        ship_date_planned: 1763510400000,
        source_version: 'v1',
        refreshed_at: 1700000000000
    })

    const second = upsert(db, {
        project_number: 'P-5004',
        project_type: 3,
        ship_date_planned: 1763510400000,
        source_version: 'v1',
        refreshed_at: 1800000000000
    })

    assert.equal(first.ok, true)
    assert.equal(first.changed, true)
    assert.equal(second.ok, true)
    assert.equal(second.changed, false)

    const fetched = getOperationsPlanByProjectNumber(db, 'P-5004')
    assert.equal(fetched.ok, true)
    assert.equal(fetched.data.refreshed_at, 1700000000000)
})
