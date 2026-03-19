import test from 'node:test'
import assert from 'node:assert/strict'
import adminRouter from '../../routes/admin.routes.js'
import adminSalesManagersRouter from '../../routes/admin.sales-managers.routes.js'
import adminProjectEngRouter from '../../routes/admin.project-engineers.routes.js'
import customersRouter from '../../routes/customers.routes.js'
import facilitiesRouter from '../../routes/customer-facilities.routes.js'
import { createTemplateRow } from '../../repositories/projectMilestoneTemplates.repo.js'
import { createPsfScanJob } from '../../repositories/psf-scan-jobs.repo.js'
import { createPsfScanResult } from '../../repositories/psf-scan-results.repo.js'
import { createTestDb } from '../helpers/test-db.js'
import { commitPsfDraft } from '../../services/psf-scanner/psf-scanner.service.js'

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

function seedActorsAndCustomerContext(db) {
    getRouteHandler(adminRouter, 'post', '/admin/createManager')({
        db,
        body: { username: 'psf.pm', fullname: 'PSF PM', email: 'psf.pm@example.com', role: 'Project Manager', isActive: 1, isAdmin: 0 }
    }, createMockRes())

    getRouteHandler(adminSalesManagersRouter, 'post', '/admin/sales-managers')({
        db,
        body: { fullname: 'PSF Sales', email: 'psf.sales@example.com', isActive: 1 }
    }, createMockRes())

    getRouteHandler(adminProjectEngRouter, 'post', '/admin/project-engineers')({
        db,
        body: { fullname: 'PSF Eng', email: 'psf.eng@example.com', isActive: 1 }
    }, createMockRes())

    const manager = db.prepare('SELECT id FROM project_managers WHERE username = ?').get('psf.pm')
    const sales = db.prepare('SELECT id FROM sales_managers WHERE email = ?').get('psf.sales@example.com')
    const engineer = db.prepare('SELECT id FROM project_engineers WHERE email = ?').get('psf.eng@example.com')

    getRouteHandler(customersRouter, 'post', '/customers')({
        db,
        body: {
            name: 'PSF Customer',
            headquarters_address: 'US',
            headquarter_contacts: 'ops@psf.test',
            project_manager_id: manager.id,
            sales_manager_id: sales.id,
            project_engineer_id: engineer.id
        }
    }, createMockRes())

    const customer = db.prepare('SELECT id FROM customers WHERE name = ?').get('PSF Customer')

    getRouteHandler(facilitiesRouter, 'post', '/customer-facilities')({
        db,
        body: {
            customer_id: customer.id,
            plant_name: 'PSF Plant',
            plant_address: 'Main',
            plant_contacts: 'ops@psf.test'
        }
    }, createMockRes())

    const facility = db.prepare('SELECT id FROM customer_facilities WHERE plant_name = ?').get('PSF Plant')

    createTemplateRow(db, { project_type: 1, milestone_code: 'M1', label: 'Machine', sequence: 1, required: 1 })
    createTemplateRow(db, { project_type: 3, milestone_code: 'MO1', label: 'Mold', sequence: 1, required: 1 })

    return {
        managerId: manager.id,
        salesManagerId: sales.id,
        projectEngineerId: engineer.id,
        customerId: customer.id,
        facilityId: facility.id
    }
}

function buildDraft(context, orderNumber = 'PS12-123456') {
    return {
        order: {
            type: 0,
            order_number: orderNumber,
            order_received_date: Date.now(),
            project_manager_id: context.managerId,
            sales_manager_id: context.salesManagerId,
            project_engineer_id: context.projectEngineerId,
            ship_to_facility_id: context.facilityId,
            customer_id: context.customerId,
            quote_ref: 'Q-PSF-1',
            po_ref: null,
            payment_terms: '50/50',
            delivery_terms: 'EXW',
            penalty: 0,
            penalty_notes: null
        },
        projects: [
            { project_number: '654321', project_description: 'PSF machine line', type: 1 },
            { project_number: '654322', project_description: 'PSF mold line', type: 3 }
        ],
        metadata: {
            source: 'pdf',
            template_version: 'psf_pdf_v1',
            confidence: 0.9
        }
    }
}

test('commitPsfDraft creates order and projects transactionally', () => {
    const db = createTestDb()
    const context = seedActorsAndCustomerContext(db)
    const draft = buildDraft(context)

    const result = commitPsfDraft(db, { draft }, { actor: 'scanner' })
    assert.equal(result.ok, true)
    assert.equal(result.idempotent_reuse, false)
    assert.equal(result.project_ids.length, 2)

    const order = db.prepare('SELECT id FROM orders WHERE order_number = ?').get('PS12-123456')
    assert.equal(Boolean(order?.id), true)
})

test('commitPsfDraft reuses committed scan job idempotently', () => {
    const db = createTestDb()
    const context = seedActorsAndCustomerContext(db)
    const draft = buildDraft(context, 'PS34-654321')

    const job = createPsfScanJob(db, {
        uploaded_by: 'scanner',
        original_filename: 'psf.pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        status: 'scanned'
    })

    createPsfScanResult(db, {
        scan_job_id: job.id,
        draft,
        warnings: [],
        errors: [],
        recommendations: [],
        fingerprint: 'abc123'
    })

    const first = commitPsfDraft(db, { scan_job_id: job.id }, { actor: 'scanner' })
    assert.equal(first.ok, true)
    assert.equal(first.idempotent_reuse, false)

    const second = commitPsfDraft(db, { scan_job_id: job.id }, { actor: 'scanner' })
    assert.equal(second.ok, true)
    assert.equal(second.idempotent_reuse, true)
    assert.equal(second.order_id, first.order_id)
})

test('commitPsfDraft fails on invalid editable draft', () => {
    const db = createTestDb()
    const context = seedActorsAndCustomerContext(db)
    const draft = buildDraft(context)
    draft.order.order_number = 'invalid'

    const result = commitPsfDraft(db, { draft }, { actor: 'scanner' })
    assert.equal(result.ok, false)
    assert.equal(result.error, 'invalid psf draft')
    assert.equal(result.issues.some((line) => line.includes('order.order_number')), true)
})
