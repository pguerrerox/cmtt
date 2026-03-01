import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import {
    createProjectManager,
    updateProjectManager,
    getProjectManagerByUsername,
    deleteProjectManager
} from '../../repositories/project-managers.repo.js'

test('createProjectManager creates and fetches a manager', () => {
    const db = createTestDb()

    const result = createProjectManager(db, {
        username: 'jdoe',
        fullname: 'John Doe',
        email: 'john.doe@example.com',
        role: 'Project Manager',
        isActive: 1,
        isAdmin: 0
    })
    assert.equal(result.ok, true)

    const fetched = getProjectManagerByUsername(db, 'jdoe')
    assert.equal(fetched.ok, true)
    assert.equal(fetched.data.fullname, 'John Doe')
})

test('createProjectManager rejects duplicate email', () => {
    const db = createTestDb()
    const payload = {
        username: 'jdoe',
        fullname: 'John Doe',
        email: 'john.doe@example.com',
        role: 'Project Manager',
        isActive: 1,
        isAdmin: 0
    }

    assert.equal(createProjectManager(db, payload).ok, true)
    const duplicate = createProjectManager(db, { ...payload, username: 'john2' })
    assert.equal(duplicate.ok, false)
    assert.equal(duplicate.error, 'manager already exists')
})

test('updateProjectManager returns not found for unknown id', () => {
    const db = createTestDb()
    const result = updateProjectManager(db, 999, { fullname: 'Nobody' })
    assert.equal(result.ok, false)
    assert.equal(result.error, 'manager not found')
})

test('createProjectManager rejects invalid role', () => {
    const db = createTestDb()

    const result = createProjectManager(db, {
        username: 'invalid-role-user',
        fullname: 'Invalid Role',
        email: 'invalid.role@example.com',
        role: 'PM',
        isActive: 1,
        isAdmin: 0
    })

    assert.equal(result.ok, false)
    assert.match(result.error, /invalid role/)
})

test('updateProjectManager rejects invalid role', () => {
    const db = createTestDb()

    createProjectManager(db, {
        username: 'jdoe',
        fullname: 'John Doe',
        email: 'john.doe@example.com',
        role: 'Project Manager',
        isActive: 1,
        isAdmin: 0
    })

    const managerId = db.prepare('SELECT id FROM project_managers WHERE username = ?').get('jdoe').id
    const result = updateProjectManager(db, managerId, { role: 'Lead PM' })

    assert.equal(result.ok, false)
    assert.match(result.error, /invalid role/)
})

test('deleteProjectManager removes an existing manager', () => {
    const db = createTestDb()
    createProjectManager(db, {
        username: 'jdoe',
        fullname: 'John Doe',
        email: 'john.doe@example.com',
        role: 'Project Manager',
        isActive: 1,
        isAdmin: 0
    })

    const managerId = db.prepare('SELECT id FROM project_managers WHERE username = ?').get('jdoe').id
    const deleted = deleteProjectManager(db, managerId)
    assert.equal(deleted.ok, true)
})
