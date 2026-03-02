import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import adminSalesManagersRouter from '../../routes/admin.sales-managers.routes.js'
import adminProjectEngRouter from '../../routes/admin.project-engineers.routes.js'
import salesManagersRouter from '../../routes/sales-managers.routes.js'
import projectEngRouter from '../../routes/project-engineers.routes.js'
import customersRouter from '../../routes/customers.routes.js'
import facilitiesRouter from '../../routes/customer-facilities.routes.js'
import adminRouter from '../../routes/admin.routes.js'

function getRouteHandler(router, method, path) {
    const layer = router.stack.find((item) =>
        item.route &&
        item.route.path === path &&
        item.route.methods[method]
    )
    return layer.route.stack[0].handle
}

function createMockRes() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code
            return this
        },
        json(payload) {
            this.body = payload
            return this
        }
    }
}

test('admin sales manager create + public read works', () => {
    const createHandler = getRouteHandler(adminSalesManagersRouter, 'post', '/admin/sales-managers')
    const readHandler = getRouteHandler(salesManagersRouter, 'get', '/sales-managers')
    const db = createTestDb()

    const createRes = createMockRes()
    createHandler({ db, body: { fullname: 'Alice', email: 'alice@example.com', isActive: 1 } }, createRes)
    assert.equal(createRes.statusCode, 201)

    const readRes = createMockRes()
    readHandler({ db }, readRes)
    assert.equal(readRes.statusCode, 200)
    assert.equal(readRes.body.data.length, 1)
})

test('admin project engineer create + public read works', () => {
    const createHandler = getRouteHandler(adminProjectEngRouter, 'post', '/admin/project-engineers')
    const readHandler = getRouteHandler(projectEngRouter, 'get', '/project-engineers')
    const db = createTestDb()

    const createRes = createMockRes()
    createHandler({ db, body: { fullname: 'Bob', email: 'bob@example.com', isActive: 1 } }, createRes)
    assert.equal(createRes.statusCode, 201)

    const readRes = createMockRes()
    readHandler({ db }, readRes)
    assert.equal(readRes.statusCode, 200)
    assert.equal(readRes.body.data.length, 1)
})

test('public customer and facility creation works', () => {
    const createCustomerHandler = getRouteHandler(customersRouter, 'post', '/customers')
    const createFacilityHandler = getRouteHandler(facilitiesRouter, 'post', '/customer-facilities')
    const createManagerHandler = getRouteHandler(adminRouter, 'post', '/admin/createManager')
    const createSalesManagerHandler = getRouteHandler(adminSalesManagersRouter, 'post', '/admin/sales-managers')
    const db = createTestDb()

    const managerRes = createMockRes()
    createManagerHandler({
        db,
        body: {
            username: 'routepm',
            fullname: 'Route PM',
            email: 'route.pm@example.com',
            role: 'Project Manager',
            isActive: 1,
            isAdmin: 0
        }
    }, managerRes)
    assert.equal(managerRes.statusCode, 201)

    const salesRes = createMockRes()
    createSalesManagerHandler({ db, body: { fullname: 'Alice', email: 'alice@example.com', isActive: 1 } }, salesRes)
    assert.equal(salesRes.statusCode, 201)

    const engRes = createMockRes()
    const createProjectEngHandler = getRouteHandler(adminProjectEngRouter, 'post', '/admin/project-engineers')
    createProjectEngHandler({ db, body: { fullname: 'Bob', email: 'bob@example.com', isActive: 1 } }, engRes)
    assert.equal(engRes.statusCode, 201)

    const manager = db.prepare('SELECT id FROM project_managers WHERE username = ?').get('routepm')
    const sales = db.prepare('SELECT id FROM sales_managers WHERE email = ?').get('alice@example.com')
    const engineer = db.prepare('SELECT id FROM project_engineers WHERE email = ?').get('bob@example.com')

    const customerRes = createMockRes()
    createCustomerHandler({
        db,
        body: {
            name: 'ACME',
            headquarters_address: 'US',
            headquarter_contacts: 'ops@acme.test',
            project_manager_id: manager.id,
            sales_manager_id: sales.id,
            project_engineer_id: engineer.id
        }
    }, customerRes)
    assert.equal(customerRes.statusCode, 201)

    const customer = db.prepare('SELECT id FROM customers WHERE name = ?').get('ACME')
    const facilityRes = createMockRes()
    createFacilityHandler({
        db,
        body: {
            customer_id: customer.id,
            plant_name: 'Plant 1',
            plant_address: 'Main St 123',
            plant_contacts: 'ops@acme.test'
        }
    }, facilityRes)
    assert.equal(facilityRes.statusCode, 201)
})
