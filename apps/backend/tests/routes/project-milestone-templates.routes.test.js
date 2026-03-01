import test from 'node:test'
import assert from 'node:assert/strict'
import projectMilestoneTemplatesRouter from '../../routes/project-milestone-templates.routes.js'
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

test('template routes create and list rows', () => {
    const db = createTestDb()

    const createHandler = getRouteHandler(projectMilestoneTemplatesRouter, 'post', '/project-milestone-templates')
    const listHandler = getRouteHandler(projectMilestoneTemplatesRouter, 'get', '/project-milestone-templates/:project_type')

    const createRes = createMockRes()
    createHandler({
        db,
        body: {
            project_type: 3,
            milestone_code: 'MIH',
            label: 'MIH',
            sequence: 1,
            required: 1
        }
    }, createRes)

    assert.equal(createRes.statusCode, 201)

    const listRes = createMockRes()
    listHandler({ db, params: { project_type: '3' }, query: {} }, listRes)
    assert.equal(listRes.statusCode, 200)
    assert.equal(listRes.body.data.length, 1)
})
