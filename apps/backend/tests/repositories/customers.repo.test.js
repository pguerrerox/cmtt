import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import { createProjectManager } from '../../repositories/project-managers.repo.js'
import { createSalesManager } from '../../repositories/sales-managers.repo.js'
import { createProjectEngineer } from '../../repositories/project-engineers.repo.js'
import {
    createCustomer,
    getAllCustomers,
    updateCustomer,
    deleteCustomer
} from '../../repositories/customers.repo.js'

function seedDependencies(db) {
    createProjectManager(db, {
        username: 'pm.alice',
        fullname: 'Alice PM',
        email: 'alice.pm@example.com',
        role: 'Project Manager',
        isActive: 1,
        isAdmin: 0
    })

    createSalesManager(db, {
        fullname: 'Alice Sales',
        email: 'alice.sales@example.com',
        isActive: 1
    })

    createProjectEngineer(db, {
        fullname: 'Bob Engineer',
        email: 'bob.engineer@example.com',
        isActive: 1
    })

    const projectManagerId = db.prepare('SELECT id FROM project_managers LIMIT 1').get().id
    const salesManagerId = db.prepare('SELECT id FROM sales_managers LIMIT 1').get().id
    const projectEngineerId = db.prepare('SELECT id FROM project_engineers LIMIT 1').get().id
    return { projectManagerId, salesManagerId, projectEngineerId }
}

test('customer repository CRUD works with FK references', () => {
    const db = createTestDb()
    const { projectManagerId, salesManagerId, projectEngineerId } = seedDependencies(db)

    const created = createCustomer(db, {
        name: 'ACME',
        headquarters_address: 'Detroit, US',
        headquarter_contacts: 'ops@acme.test',
        project_manager_id: projectManagerId,
        sales_manager_id: salesManagerId,
        project_engineer_id: projectEngineerId
    })
    assert.equal(created.ok, true)

    const list = getAllCustomers(db)
    assert.equal(list.ok, true)
    assert.equal(list.data.length, 1)

    const id = list.data[0].id
    const updated = updateCustomer(db, id, { headquarters_address: 'Toronto, CA' })
    assert.equal(updated.ok, true)

    const deleted = deleteCustomer(db, id)
    assert.equal(deleted.ok, true)
})
