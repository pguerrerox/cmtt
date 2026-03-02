import test from 'node:test'
import assert from 'node:assert/strict'
import projectsCoreRouter from '../../routes/projects-core.routes.js'
import ordersRouter from '../../routes/orders.routes.js'
import adminRouter from '../../routes/admin.routes.js'
import adminSalesManagersRouter from '../../routes/admin.sales-managers.routes.js'
import adminProjectEngRouter from '../../routes/admin.project-engineers.routes.js'
import customersRouter from '../../routes/customers.routes.js'
import facilitiesRouter from '../../routes/customer-facilities.routes.js'
import { createTemplateRow } from '../../repositories/projectMilestoneTemplates.repo.js'
import { upsert as upsertOperationsPlan } from '../../repositories/operations.repo.js'
import { createTestDb } from '../helpers/test-db.js'

function getRouteHandler(router, method, path) {
    const layer = router.stack.find((item) => item.route && item.route.path === path && item.route.methods[method])
    return layer.route.stack[0].handle
}

function createMockRes() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this },
        json(payload) { this.body = payload; return this }
    }
}

function seedProjectContext(db) {
    getRouteHandler(adminRouter, 'post', '/admin/createManager')({
        db,
        body: { username: 'pc.pm', fullname: 'PC PM', email: 'pc.pm@example.com', role: 'Project Manager', isActive: 1, isAdmin: 0 }
    }, createMockRes())
    getRouteHandler(adminSalesManagersRouter, 'post', '/admin/sales-managers')({
        db,
        body: { fullname: 'PC Sales', email: 'pc.sales@example.com', isActive: 1 }
    }, createMockRes())
    getRouteHandler(adminProjectEngRouter, 'post', '/admin/project-engineers')({
        db,
        body: { fullname: 'PC Eng', email: 'pc.eng@example.com', isActive: 1 }
    }, createMockRes())

    const manager = db.prepare('SELECT id FROM project_managers WHERE username = ?').get('pc.pm')
    const sales = db.prepare('SELECT id FROM sales_managers WHERE email = ?').get('pc.sales@example.com')
    const engineer = db.prepare('SELECT id FROM project_engineers WHERE email = ?').get('pc.eng@example.com')

    getRouteHandler(customersRouter, 'post', '/customers')({
        db,
        body: {
            name: 'ACME',
            headquarters_address: 'US',
            headquarter_contacts: 'ops@acme.test',
            project_manager_id: manager.id,
            sales_manager_id: sales.id,
            project_engineer_id: engineer.id
        }
    }, createMockRes())
    const customer = db.prepare('SELECT id FROM customers WHERE name = ?').get('ACME')

    getRouteHandler(facilitiesRouter, 'post', '/customer-facilities')({
        db,
        body: { customer_id: customer.id, plant_name: 'Plant X', plant_address: 'Main', plant_contacts: 'ops@acme.test' }
    }, createMockRes())
    const facility = db.prepare('SELECT id FROM customer_facilities WHERE plant_name = ?').get('Plant X')

    const orderRes = createMockRes()
    getRouteHandler(ordersRouter, 'post', '/orders')({
        db,
        body: {
            type: 1,
            order_number: 'EF56-111111',
            order_received_date: Date.now(),
            project_manager_id: manager.id,
            sales_manager_id: sales.id,
            project_engineer_id: engineer.id,
            ship_to_facility_id: facility.id,
            customer_id: customer.id,
            quote_ref: 'Q-1',
            payment_terms: '50/50',
            delivery_terms: 'EXW',
            penalty: 0
        }
    }, orderRes)

    createTemplateRow(db, { project_type: 1, milestone_code: 'M1', label: 'Machine', sequence: 1, required: 1 })
    createTemplateRow(db, { project_type: 3, milestone_code: 'MO1', label: 'Mold', sequence: 1, required: 1 })

    const order = db.prepare('SELECT id FROM orders WHERE order_number = ?').get('EF56-111111')
    return { orderId: order.id }
}

test('POST /projects-core creates machine project', () => {
    const db = createTestDb()
    const { orderId } = seedProjectContext(db)
    const handler = getRouteHandler(projectsCoreRouter, 'post', '/projects-core')
    const res = createMockRes()

    handler({ db, body: { order_id: orderId, project_number: '100001', project_description: 'Machine', type: 1 } }, res)
    assert.equal(res.statusCode, 201)
    assert.equal(res.body.lookup_status, 'not_applicable')
})

test('POST /projects-core creates mold project with enrichment', () => {
    const db = createTestDb()
    const { orderId } = seedProjectContext(db)
    upsertOperationsPlan(db, { project_type: 3, project_number: '100002' })

    const handler = getRouteHandler(projectsCoreRouter, 'post', '/projects-core')
    const res = createMockRes()
    handler({ db, body: { order_id: orderId, project_number: '100002', project_description: 'Mold', type: 3 } }, res)

    assert.equal(res.statusCode, 201)
    assert.equal(res.body.lookup_status, 'enriched')
})
