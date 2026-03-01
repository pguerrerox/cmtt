import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import {
    createSalesManager,
    getAllSalesManagers,
    updateSalesManager,
    deleteSalesManager
} from '../../repositories/sales-managers.repo.js'

test('sales manager repository CRUD works', () => {
    const db = createTestDb()

    const created = createSalesManager(db, {
        fullname: 'Alice Sales',
        email: 'alice.sales@example.com',
        isActive: 1
    })
    assert.equal(created.ok, true)

    const list = getAllSalesManagers(db)
    assert.equal(list.ok, true)
    assert.equal(list.data.length, 1)

    const id = list.data[0].id
    const updated = updateSalesManager(db, id, { isActive: 0 })
    assert.equal(updated.ok, true)

    const deleted = deleteSalesManager(db, id)
    assert.equal(deleted.ok, true)
})
