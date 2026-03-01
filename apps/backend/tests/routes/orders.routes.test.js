import test from 'node:test'
import assert from 'node:assert/strict'
import ordersRouter from '../../routes/orders.routes.js'
import adminRouter from '../../routes/admin.routes.js'
import adminSalesManagersRouter from '../../routes/admin.sales-managers.routes.js'
import adminProjectEngRouter from '../../routes/admin.project-engineers.routes.js'
import customersRouter from '../../routes/customers.routes.js'
import facilitiesRouter from '../../routes/customer-facilities.routes.js'
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

function seedOrderDependencies(db) {
    getRouteHandler(adminRouter, 'post', '/admin/createManager')({
        db,
        body: {
            username: 'orders.pm',
            fullname: 'Orders PM',
            email: 'orders.pm@example.com',
            role: 'Project Manager',
            isActive: 1,
            isAdmin: 0
        }
    }, createMockRes())

    getRouteHandler(adminSalesManagersRouter, 'post', '/admin/sales-managers')({
        db,
        body: { fullname: 'Orders Sales', email: 'orders.sales@example.com', isActive: 1 }
    }, createMockRes())

    getRouteHandler(adminProjectEngRouter, 'post', '/admin/project-engineers')({
        db,
        body: { fullname: 'Orders Eng', email: 'orders.eng@example.com', isActive: 1 }
    }, createMockRes())

    const manager = db.prepare('SELECT id FROM project_managers WHERE username = ?').get('orders.pm')
    const sales = db.prepare('SELECT id FROM sales_managers WHERE email = ?').get('orders.sales@example.com')
    const engineer = db.prepare('SELECT id FROM project_engineers WHERE email = ?').get('orders.eng@example.com')

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
        body: {
            customer_id: customer.id,
            plant_name: 'Plant 1',
            plant_address: 'Main St 1',
            plant_contacts: 'ops@acme.test'
        }
    }, createMockRes())

    const facility = db.prepare('SELECT id FROM customer_facilities WHERE plant_name = ?').get('Plant 1')
    return { manager, sales, engineer, customer, facility }
}

test('POST /orders creates an order', () => {
    const db = createTestDb()
    const deps = seedOrderDependencies(db)
    const handler = getRouteHandler(ordersRouter, 'post', '/orders')
    const res = createMockRes()

    handler({
        db,
        body: {
            type: 1,
            order_number: 'AB12-123456',
            order_received_date: Date.now(),
            project_manager_id: deps.manager.id,
            sales_manager_id: deps.sales.id,
            project_engineer_id: deps.engineer.id,
            ship_to_facility_id: deps.facility.id,
            customer_id: deps.customer.id,
            quote_ref: 'Q-1',
            payment_terms: '50/50',
            delivery_terms: 'EXW',
            penalty: 0
        }
    }, res)

    assert.equal(res.statusCode, 201)
    assert.equal(res.body.ok, true)
})

test('GET /orders/:id returns order', () => {
    const db = createTestDb()
    const deps = seedOrderDependencies(db)
    const create = getRouteHandler(ordersRouter, 'post', '/orders')
    const createRes = createMockRes()

    create({
        db,
        body: {
            type: 1,
            order_number: 'CD34-654321',
            order_received_date: Date.now(),
            project_manager_id: deps.manager.id,
            sales_manager_id: deps.sales.id,
            project_engineer_id: deps.engineer.id,
            ship_to_facility_id: deps.facility.id,
            customer_id: deps.customer.id,
            quote_ref: 'Q-2',
            payment_terms: '100%',
            delivery_terms: 'FOB',
            penalty: 1
        }
    }, createRes)

    const order = db.prepare('SELECT id FROM orders WHERE order_number = ?').get('CD34-654321')
    const getHandler = getRouteHandler(ordersRouter, 'get', '/orders/:id')
    const getRes = createMockRes()

    getHandler({ db, params: { id: order.id } }, getRes)
    assert.equal(getRes.statusCode, 200)
    assert.equal(getRes.body.data.order_number, 'CD34-654321')
})
