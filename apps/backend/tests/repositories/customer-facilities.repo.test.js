import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import { createProjectManager } from '../../repositories/project-managers.repo.js'
import { createSalesManager } from '../../repositories/sales-managers.repo.js'
import { createProjectEngineer } from '../../repositories/project-engineers.repo.js'
import { createCustomer } from '../../repositories/customers.repo.js'
import {
    createCustomerFacility,
    getAllCustomerFacilities,
    updateCustomerFacility,
    deleteCustomerFacility
} from '../../repositories/customer-facilities.repo.js'

function seedCustomer(db) {
    createProjectManager(db, {
        username: 'pm.facility',
        fullname: 'Facility PM',
        email: 'facility.pm@example.com',
        role: 'Project Manager',
        isActive: 1,
        isAdmin: 0
    })
    createSalesManager(db, {
        fullname: 'Facility Sales',
        email: 'facility.sales@example.com',
        isActive: 1
    })
    createProjectEngineer(db, {
        fullname: 'Facility Engineer',
        email: 'facility.eng@example.com',
        isActive: 1
    })

    const projectManagerId = db.prepare('SELECT id FROM project_managers LIMIT 1').get().id
    const salesManagerId = db.prepare('SELECT id FROM sales_managers LIMIT 1').get().id
    const projectEngineerId = db.prepare('SELECT id FROM project_engineers LIMIT 1').get().id

    createCustomer(db, {
        name: 'ACME',
        headquarters_address: 'Detroit, US',
        headquarter_contacts: 'ops@acme.test',
        project_manager_id: projectManagerId,
        sales_manager_id: salesManagerId,
        project_engineer_id: projectEngineerId
    })
    return db.prepare('SELECT id FROM customers LIMIT 1').get().id
}

test('facility repository CRUD works with customer FK', () => {
    const db = createTestDb()
    const customerId = seedCustomer(db)

    const created = createCustomerFacility(db, {
        customer_id: customerId,
        plant_name: 'Plant 1',
        plant_address: 'Main St 123',
        plant_contacts: 'ops@acme.test'
    })
    assert.equal(created.ok, true)

    const list = getAllCustomerFacilities(db)
    assert.equal(list.ok, true)
    assert.equal(list.data.length, 1)

    const id = list.data[0].id
    const updated = updateCustomerFacility(db, id, { plant_address: 'Main St 999' })
    assert.equal(updated.ok, true)

    const deleted = deleteCustomerFacility(db, id)
    assert.equal(deleted.ok, true)
})
