import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import {
    createProjectEngineer,
    getAllProjectEngineers,
    updateProjectEngineer,
    deleteProjectEngineer
} from '../../repositories/project-engineers.repo.js'

test('project engineer repository CRUD works', () => {
    const db = createTestDb()

    const created = createProjectEngineer(db, {
        fullname: 'Bob Engineer',
        email: 'bob.engineer@example.com',
        isActive: 1
    })
    assert.equal(created.ok, true)

    const list = getAllProjectEngineers(db)
    assert.equal(list.ok, true)
    assert.equal(list.data.length, 1)

    const id = list.data[0].id
    const updated = updateProjectEngineer(db, id, { isActive: 0 })
    assert.equal(updated.ok, true)

    const deleted = deleteProjectEngineer(db, id)
    assert.equal(deleted.ok, true)
})
