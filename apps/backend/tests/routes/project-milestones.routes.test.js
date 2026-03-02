import test from 'node:test'
import assert from 'node:assert/strict'
import projectMilestonesRouter from '../../routes/project-milestones.routes.js'
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

function seedProject(db) {
    db.prepare("INSERT INTO project_managers (fullname, username, email, role, isActive, isAdmin, created_at, updated_at) VALUES ('A','a','a@a.com','Project Manager',1,0,1,1)").run()
    db.prepare("INSERT INTO sales_managers (fullname, email, isActive, created_at, updated_at) VALUES ('B','b@b.com',1,1,1)").run()
    db.prepare("INSERT INTO project_engineers (fullname, email, isActive, created_at, updated_at) VALUES ('C','c@c.com',1,1,1)").run()
    db.prepare("INSERT INTO customers (name, headquarters_address, headquarter_contacts, project_manager_id, sales_manager_id, project_engineer_id, created_at, updated_at) VALUES ('Cust','Addr','Contacts',1,1,1,1,1)").run()
    db.prepare("INSERT INTO customer_facilities (customer_id, plant_name, plant_address, plant_contacts, created_at, updated_at) VALUES (1,'Plant','Addr','Contacts',1,1)").run()
    db.prepare("INSERT INTO orders (type, order_number, order_received_date, project_manager_id, sales_manager_id, project_engineer_id, ship_to_facility_id, customer_id, quote_ref, payment_terms, delivery_terms, penalty, snapshot_created_at, created_at, updated_at) VALUES (1,'IJ90-222222',1,1,1,1,1,1,'Q','50/50','EXW',0,1,1,1)").run()
    db.prepare("INSERT INTO projects_core (order_id, project_number, project_description, type, status, credit_status, snapshot_order_number, snapshot_project_type, snapshot_status, snapshot_created_at, created_at, updated_at) VALUES (1,'555555','Project',1,'New',1,'IJ90-222222',1,'New',1,1,1)").run()
    return 1
}

test('milestone routes create/list/update/delete', () => {
    const db = createTestDb()
    const projectId = seedProject(db)

    const createHandler = getRouteHandler(projectMilestonesRouter, 'post', '/project-milestones')
    const listHandler = getRouteHandler(projectMilestonesRouter, 'get', '/projects-core/:project_id/milestones')
    const updateHandler = getRouteHandler(projectMilestonesRouter, 'patch', '/project-milestones/:id')
    const deleteHandler = getRouteHandler(projectMilestonesRouter, 'delete', '/project-milestones/:id')

    const createRes = createMockRes()
    createHandler({
        db,
        body: {
            project_id: projectId,
            milestone_code: 'PIH',
            sequence: 1,
            required: 1
        }
    }, createRes)
    assert.equal(createRes.statusCode, 201)

    const listRes = createMockRes()
    listHandler({ db, params: { project_id: projectId } }, listRes)
    assert.equal(listRes.statusCode, 200)
    assert.equal(listRes.body.data.length, 1)

    const milestoneId = listRes.body.data[0].id
    const updateRes = createMockRes()
    updateHandler({ db, params: { id: milestoneId }, body: { milestone_status: 'done' } }, updateRes)
    assert.equal(updateRes.statusCode, 200)

    const deleteRes = createMockRes()
    deleteHandler({ db, params: { id: milestoneId } }, deleteRes)
    assert.equal(deleteRes.statusCode, 200)
})
