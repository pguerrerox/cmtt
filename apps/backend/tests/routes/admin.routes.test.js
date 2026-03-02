import test from 'node:test'
import assert from 'node:assert/strict'
import adminRouter from '../../routes/admin.routes.js'
import { createTestDb } from '../helpers/test-db.js'

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

test('POST /admin/createManager creates manager', () => {
    const handler = getRouteHandler(adminRouter, 'post', '/admin/createManager')
    const db = createTestDb()
    const res = createMockRes()

    handler(
        {
            db,
            body: {
                username: 'jdoe',
                fullname: 'John Doe',
                email: 'john.doe@example.com',
                role: 'Project Manager',
                isActive: 1,
                isAdmin: 0
            }
        },
        res
    )

    assert.equal(res.statusCode, 201)
    assert.match(res.body.message, /was added successfully/)
})

test('POST /admin/createManager returns 409 for duplicate manager', () => {
    const handler = getRouteHandler(adminRouter, 'post', '/admin/createManager')
    const db = createTestDb()
    const payload = {
        username: 'jdoe',
        fullname: 'John Doe',
        email: 'john.doe@example.com',
        role: 'Project Manager',
        isActive: 1,
        isAdmin: 0
    }

    const firstRes = createMockRes()
    const duplicateRes = createMockRes()

    handler({ db, body: payload }, firstRes)
    handler({ db, body: payload }, duplicateRes)

    assert.equal(firstRes.statusCode, 201)
    assert.equal(duplicateRes.statusCode, 409)
    assert.equal(duplicateRes.body.error, 'manager already exists')
})

test('POST /admin/createManager returns 400 for invalid role', () => {
    const handler = getRouteHandler(adminRouter, 'post', '/admin/createManager')
    const db = createTestDb()
    const res = createMockRes()

    handler(
        {
            db,
            body: {
                username: 'invalidrole',
                fullname: 'Invalid Role',
                email: 'invalid.role@example.com',
                role: 'PM',
                isActive: 1,
                isAdmin: 0
            }
        },
        res
    )

    assert.equal(res.statusCode, 400)
    assert.match(res.body.error, /invalid role/)
})
