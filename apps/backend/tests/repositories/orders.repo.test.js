import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import { createProjectManager } from '../../repositories/project-managers.repo.js'
import { createSalesManager } from '../../repositories/sales-managers.repo.js'
import { createProjectEngineer } from '../../repositories/project-engineers.repo.js'
import { createCustomer } from '../../repositories/customers.repo.js'
import { createCustomerFacility } from '../../repositories/customer-facilities.repo.js'
import { createOrder, getOrderByNumber, updateOrder } from '../../repositories/orders.repo.js'

function seedOrderDependencies(db) {
    createProjectManager(db, {
        username: 'pm.orders',
        fullname: 'Order PM',
        email: 'order.pm@example.com',
        role: 'Project Manager',
        isActive: 1,
        isAdmin: 0
    })
    createSalesManager(db, { fullname: 'Order Sales', email: 'order.sales@example.com', isActive: 1 })
    createProjectEngineer(db, { fullname: 'Order Eng', email: 'order.eng@example.com', isActive: 1 })

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
        plant_name: 'ACME Plant 1',
        plant_address: 'Main St 1',
        plant_contacts: 'plant@acme.test'
    })

    const facilityId = db.prepare('SELECT id FROM customer_facilities LIMIT 1').get().id

    return { projectManagerId, salesManagerId, projectEngineerId, customerId, facilityId }
}

test('orders repo creates and retrieves order with snapshots', () => {
    const db = createTestDb()
    const deps = seedOrderDependencies(db)

    const created = createOrder(db, {
        type: 1,
        order_number: 'AB12-123456',
        order_received_date: Date.now(),
        project_manager_id: deps.projectManagerId,
        sales_manager_id: deps.salesManagerId,
        project_engineer_id: deps.projectEngineerId,
        ship_to_facility_id: deps.facilityId,
        customer_id: deps.customerId,
        quote_ref: 'Q-1000',
        payment_terms: '50/50',
        delivery_terms: 'EXW',
        penalty: 0
    })

    assert.equal(created.ok, true)
    const fetched = getOrderByNumber(db, 'AB12-123456')
    assert.equal(fetched.ok, true)
    assert.equal(fetched.data.snapshot_customer_name, 'ACME')
    assert.equal(fetched.data.snapshot_facility_name, 'ACME Plant 1')
})

test('orders repo rejects facility/customer mismatch', () => {
    const db = createTestDb()
    const deps = seedOrderDependencies(db)

    createCustomer(db, {
        name: 'Other Customer',
        headquarters_address: 'Austin, US',
        headquarter_contacts: 'ops@other.test',
        project_manager_id: deps.projectManagerId,
        sales_manager_id: deps.salesManagerId,
        project_engineer_id: deps.projectEngineerId
    })
    const otherCustomerId = db.prepare('SELECT id FROM customers WHERE name = ?').get('Other Customer').id

    const created = createOrder(db, {
        type: 1,
        order_number: 'CD34-654321',
        order_received_date: Date.now(),
        project_manager_id: deps.projectManagerId,
        sales_manager_id: deps.salesManagerId,
        project_engineer_id: deps.projectEngineerId,
        ship_to_facility_id: deps.facilityId,
        customer_id: otherCustomerId,
        quote_ref: 'Q-2000',
        payment_terms: '100%',
        delivery_terms: 'FOB',
        penalty: 0
    })

    assert.equal(created.ok, false)
    assert.equal(created.error, 'facility does not belong to customer')
})

test('orders repo updates mutable fields', () => {
    const db = createTestDb()
    const deps = seedOrderDependencies(db)
    createOrder(db, {
        type: 1,
        order_number: 'EF56-222333',
        order_received_date: Date.now(),
        project_manager_id: deps.projectManagerId,
        sales_manager_id: deps.salesManagerId,
        project_engineer_id: deps.projectEngineerId,
        ship_to_facility_id: deps.facilityId,
        customer_id: deps.customerId,
        quote_ref: 'Q-3000',
        payment_terms: '50/50',
        delivery_terms: 'EXW',
        penalty: 0
    })
    const id = db.prepare('SELECT id FROM orders WHERE order_number = ?').get('EF56-222333').id

    const updated = updateOrder(db, id, { po_ref: 'PO-1', penalty: 1 })
    assert.equal(updated.ok, true)

    const fetched = getOrderByNumber(db, 'EF56-222333')
    assert.equal(fetched.data.po_ref, 'PO-1')
    assert.equal(fetched.data.penalty, 1)
})
