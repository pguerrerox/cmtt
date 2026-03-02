import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import { getOperationsPlanByProjectNumber } from '../../repositories/operations.repo.js'
import { runOperationsImportWorker } from '../../workers/operationsImport.worker.js'

test('operations import worker upserts valid rows and skips missing project number', () => {
  const db = createTestDb()

  const result = runOperationsImportWorker(db, {
    sourceVersion: 'test-source',
    refreshedAt: 1700000000000,
    loadRows: () => ([
      {
        project_number: 'P-8000',
        kickoff_date_planned: '1760918400000',
        ship_date_planned: '1763510400000',
        customer_name: 'ignored by importer'
      },
      {
        project_number: '',
        kickoff_date_planned: '1760918400000'
      }
    ])
  })

  assert.equal(result.ok, true)
  assert.equal(result.processed, 2)
  assert.equal(result.imported, 1)
  assert.equal(result.skipped, 1)
  assert.equal(result.failed, 0)

  const fetched = getOperationsPlanByProjectNumber(db, 'P-8000')
  assert.equal(fetched.ok, true)
  assert.equal(fetched.data.kickoff_date_planned, 1760918400000)
  assert.equal(fetched.data.ship_date_planned, 1763510400000)
  assert.equal(fetched.data.source_version, 'test-source')
  assert.equal(fetched.data.refreshed_at, 1700000000000)
})

test('operations import worker returns error when loader fails', () => {
  const db = createTestDb()

  const result = runOperationsImportWorker(db, {
    loadRows: () => {
      throw new Error('missing source file')
    }
  })

  assert.equal(result.ok, false)
  assert.equal(result.processed, 0)
  assert.equal(result.imported, 0)
  assert.equal(result.failed, 0)
  assert.equal(result.errors.length, 1)
  assert.equal(result.errors[0], 'missing source file')
})

test('operations import worker counts unchanged rows as skipped', () => {
  const db = createTestDb()
  const loadRows = () => ([
    {
      project_number: 'P-8100',
      kickoff_date_planned: '1760918400000',
      ship_date_planned: '1763510400000'
    }
  ])

  const firstRun = runOperationsImportWorker(db, {
    sourceVersion: 'test-source',
    refreshedAt: 1700000000000,
    loadRows
  })

  const secondRun = runOperationsImportWorker(db, {
    sourceVersion: 'test-source',
    refreshedAt: 1800000000000,
    loadRows
  })

  assert.equal(firstRun.ok, true)
  assert.equal(firstRun.processed, 1)
  assert.equal(firstRun.imported, 1)
  assert.equal(firstRun.skipped, 0)

  assert.equal(secondRun.ok, true)
  assert.equal(secondRun.processed, 1)
  assert.equal(secondRun.imported, 0)
  assert.equal(secondRun.skipped, 1)
})
