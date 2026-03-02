import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import { createProjectCore } from '../../repositories/projectsCore.repo.js'
import { createOrder } from '../../repositories/orders.repo.js'
import { createProjectManager } from '../../repositories/project-managers.repo.js'
import { createSalesManager } from '../../repositories/sales-managers.repo.js'
import { createProjectEngineer } from '../../repositories/project-engineers.repo.js'
import { createCustomer } from '../../repositories/customers.repo.js'
import { createCustomerFacility } from '../../repositories/customer-facilities.repo.js'
import { createTemplateRow } from '../../repositories/projectMilestoneTemplates.repo.js'
import { upsert as upsertOperationsPlan } from '../../repositories/operations.repo.js'
import {
    enqueueProject,
    getProjectByNumber as getQueuedProjectByNumber,
    updateQueueEntry
} from '../../repositories/operations-lookup-queue.repo.js'
import { runOperationsLookupQueueWorker } from '../../workers/operations-lookup-queue.worker.js'

function seedOrderAndProject(db, projectNumber) {
    createProjectManager(db, {
        username: 'worker.pm',
        fullname: 'Worker PM',
        email: 'worker.pm@example.com',
        role: 'Project Manager',
        isActive: 1,
        isAdmin: 0
    })
    createSalesManager(db, { fullname: 'Worker Sales', email: 'worker.sales@example.com', isActive: 1 })
    createProjectEngineer(db, { fullname: 'Worker Eng', email: 'worker.eng@example.com', isActive: 1 })

    const pmId = db.prepare('SELECT id FROM project_managers LIMIT 1').get().id
    const smId = db.prepare('SELECT id FROM sales_managers LIMIT 1').get().id
    const peId = db.prepare('SELECT id FROM project_engineers LIMIT 1').get().id

    createCustomer(db, {
        name: 'ACME',
        headquarters_address: 'US',
        headquarter_contacts: 'ops@acme.test',
        project_manager_id: pmId,
        sales_manager_id: smId,
        project_engineer_id: peId
    })
    const customerId = db.prepare('SELECT id FROM customers LIMIT 1').get().id

    createCustomerFacility(db, {
        customer_id: customerId,
        plant_name: 'Plant 1',
        plant_address: 'Main',
        plant_contacts: 'ops@acme.test'
    })
    const facilityId = db.prepare('SELECT id FROM customer_facilities LIMIT 1').get().id

    createOrder(db, {
        type: 1,
        order_number: 'WK12-123456',
        order_received_date: Date.now(),
        project_manager_id: pmId,
        sales_manager_id: smId,
        project_engineer_id: peId,
        ship_to_facility_id: facilityId,
        customer_id: customerId,
        quote_ref: 'Q-1',
        payment_terms: '50/50',
        delivery_terms: 'EXW',
        penalty: 0
    })
    const orderId = db.prepare('SELECT id FROM orders WHERE order_number = ?').get('WK12-123456').id

    createTemplateRow(db, { project_type: 3, milestone_code: 'MO1', label: 'Mold', sequence: 1, required: 1 })

    createProjectCore(db, {
        order_id: orderId,
        project_number: projectNumber,
        project_description: 'Worker project',
        type: 3
    })
}

test('worker enriches due project and removes it from queue', () => {
    const db = createTestDb()
    seedOrderAndProject(db, '900000')

    enqueueProject(db, '900000', { status: 'pending', project_type: 3, order_number: 'WK12-123456' })

    upsertOperationsPlan(db, {
        order_number: 'WK12-123456',
        project_type: 3,
        project_number: '900000',
        kickoff_date_planned: 1760918400000,
        ship_date_planned: 1763510400000
    })

    const result = runOperationsLookupQueueWorker(db, {
        now: 1760000000000,
        batchSize: 10,
        retryDelayMs: 1000,
        maxAttempts: 3
    })

    assert.equal(result.ok, true)
    assert.equal(result.processed, 1)
    assert.equal(result.enriched, 1)
    assert.equal(result.removed, 1)

    const queued = getQueuedProjectByNumber(db, '900000')
    assert.equal(queued.ok, false)
})

test('worker retries due project when operations are still missing', () => {
    const db = createTestDb()
    seedOrderAndProject(db, '900001')

    enqueueProject(db, '900001', { status: 'pending', project_type: 3, order_number: 'WK12-123456' })

    const result = runOperationsLookupQueueWorker(db, {
        now: 1000,
        batchSize: 10,
        retryDelayMs: 5000,
        maxAttempts: 3
    })

    assert.equal(result.ok, true)
    assert.equal(result.processed, 1)
    assert.equal(result.retried, 1)
    assert.equal(result.failed, 0)

    const queued = getQueuedProjectByNumber(db, '900001')
    assert.equal(queued.ok, true)
    assert.equal(queued.data.status, 'pending')
    assert.equal(queued.data.attempts, 1)
    assert.equal(queued.data.last_attempt_date, 1000)
    assert.equal(queued.data.next_attempt_date, 6000)
})

test('worker marks project as failed when max attempts are reached', () => {
    const db = createTestDb()
    seedOrderAndProject(db, '900002')

    enqueueProject(db, '900002', { status: 'pending', project_type: 3, order_number: 'WK12-123456' })

    updateQueueEntry(db, '900002', {
        attempts: 2,
        status: 'pending',
        next_attempt_date: 900
    })

    const result = runOperationsLookupQueueWorker(db, {
        now: 1000,
        batchSize: 10,
        retryDelayMs: 5000,
        maxAttempts: 3
    })

    assert.equal(result.ok, true)
    assert.equal(result.processed, 1)
    assert.equal(result.failed, 1)
    assert.equal(result.retried, 0)

    const queued = getQueuedProjectByNumber(db, '900002')
    assert.equal(queued.ok, true)
    assert.equal(queued.data.status, 'failed')
    assert.equal(queued.data.attempts, 3)
    assert.equal(queued.data.next_attempt_date, null)
})
