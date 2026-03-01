import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import { createProjectManager } from '../../repositories/project-managers.repo.js'
import { createSalesManager } from '../../repositories/sales-managers.repo.js'
import { createProjectEngineer } from '../../repositories/project-engineers.repo.js'
import { createCustomer } from '../../repositories/customers.repo.js'
import { createCustomerFacility } from '../../repositories/customer-facilities.repo.js'
import { createOrder } from '../../repositories/orders.repo.js'
import { createTemplateRow } from '../../repositories/projectMilestoneTemplates.repo.js'
import { createProjectCore, getProjectCoreById } from '../../repositories/projectsCore.repo.js'
import { upsert as upsertOperationsPlan } from '../../repositories/operations.repo.js'
import { getProjectByNumber as getQueuedProjectByNumber } from '../../repositories/operations-lookup-queue.repo.js'

function seedProjectDependencies(db) {
    createProjectManager(db, {
        username: 'pm.phase2',
        fullname: 'Phase2 PM',
        email: 'phase2.pm@example.com',
        role: 'Project Manager',
        isActive: 1,
        isAdmin: 0
    })
    createSalesManager(db, { fullname: 'Phase2 Sales', email: 'phase2.sales@example.com', isActive: 1 })
    createProjectEngineer(db, { fullname: 'Phase2 Eng', email: 'phase2.eng@example.com', isActive: 1 })

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
    const customerId = db.prepare('SELECT id FROM customers LIMIT 1').get().id

    createCustomerFacility(db, {
        customer_id: customerId,
        plant_name: 'Plant A',
        plant_address: 'Main St 100',
        plant_contacts: 'plant@acme.test'
    })
    const facilityId = db.prepare('SELECT id FROM customer_facilities LIMIT 1').get().id

    createOrder(db, {
        type: 1,
        order_number: 'GH78-100200',
        order_received_date: Date.now(),
        project_manager_id: projectManagerId,
        sales_manager_id: salesManagerId,
        project_engineer_id: projectEngineerId,
        ship_to_facility_id: facilityId,
        customer_id: customerId,
        quote_ref: 'Q-9000',
        payment_terms: '50/50',
        delivery_terms: 'EXW',
        penalty: 0
    })
    const orderId = db.prepare('SELECT id FROM orders WHERE order_number = ?').get('GH78-100200').id

    createTemplateRow(db, { project_type: 1, milestone_code: 'M1', label: 'Machine 1', sequence: 1, required: 1 })
    createTemplateRow(db, { project_type: 2, milestone_code: 'A1', label: 'Aux 1', sequence: 1, required: 1 })
    createTemplateRow(db, { project_type: 3, milestone_code: 'MO1', label: 'Mold 1', sequence: 1, required: 1 })

    return { orderId }
}

test('projectsCore creates machine project and skips enrichment', () => {
    const db = createTestDb()
    const { orderId } = seedProjectDependencies(db)

    const created = createProjectCore(db, {
        order_id: orderId,
        project_number: '111111',
        project_description: 'Machine line',
        type: 1
    })

    assert.equal(created.ok, true)
    assert.equal(created.lookup_status, 'not_applicable')

    const fetched = getProjectCoreById(db, created.id)
    assert.equal(fetched.ok, true)
    assert.equal(fetched.data.milestones.length, 1)
    assert.equal(fetched.data.milestones[0].milestone_code, 'M1')
})

test('projectsCore creates mold project and enriches when operations exist', () => {
    const db = createTestDb()
    const { orderId } = seedProjectDependencies(db)

    upsertOperationsPlan(db, {
        order_number: 'GH78-100200',
        project_type: 3,
        project_number: '222222',
        source_version: 'v1'
    })

    const created = createProjectCore(db, {
        order_id: orderId,
        project_number: '222222',
        project_description: 'Mold line',
        type: 3
    })

    assert.equal(created.ok, true)
    assert.equal(created.lookup_status, 'enriched')
})

test('projectsCore creates mold project and queues when operations missing', () => {
    const db = createTestDb()
    const { orderId } = seedProjectDependencies(db)

    const created = createProjectCore(db, {
        order_id: orderId,
        project_number: '333333',
        project_description: 'Mold queued',
        type: 3
    })

    assert.equal(created.ok, true)
    assert.equal(created.lookup_status, 'queued')

    const queued = getQueuedProjectByNumber(db, '333333')
    assert.equal(queued.ok, true)
    assert.equal(queued.data.project_type, 3)
})
