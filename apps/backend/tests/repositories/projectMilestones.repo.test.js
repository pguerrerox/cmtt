import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import { createTemplateRow } from '../../repositories/projectMilestoneTemplates.repo.js'
import { seedMilestonesFromTemplate, listMilestonesByProject, updateMilestoneRow } from '../../repositories/projectMilestones.repo.js'

function seedProject(db) {
    db.prepare(`
        INSERT INTO orders (
            type, order_number, order_received_date,
            project_manager_id, sales_manager_id, project_engineer_id,
            ship_to_facility_id, customer_id,
            quote_ref, payment_terms, delivery_terms,
            penalty, snapshot_created_at, created_at, updated_at
        ) VALUES (0, 'ZZ99-999999', ?, 1, 1, 1, 1, 1, 'Q', '50/50', 'EXW', 0, ?, ?, ?)
    `).run(Date.now(), Date.now(), Date.now(), Date.now())
    db.prepare(`
        INSERT INTO projects_core (
            order_id, project_number, project_description, type,
            status, credit_status, snapshot_order_number,
            snapshot_project_type, snapshot_status, snapshot_created_at,
            created_at, updated_at
        ) VALUES (1, '444444', 'Seed project', 1, 'New', 1, 'ZZ99-999999', 1, 'New', ?, ?, ?)
    `).run(Date.now(), Date.now(), Date.now())
    return 1
}

test('project milestones repo seeds and updates milestone rows', () => {
    const db = createTestDb()

    db.prepare("INSERT INTO project_managers (fullname, username, email, role, isActive, isAdmin, created_at, updated_at) VALUES ('A','a','a@a.com','Project Manager',1,0,1,1)").run()
    db.prepare("INSERT INTO sales_managers (fullname, email, isActive, created_at, updated_at) VALUES ('B','b@b.com',1,1,1)").run()
    db.prepare("INSERT INTO project_engineers (fullname, email, isActive, created_at, updated_at) VALUES ('C','c@c.com',1,1,1)").run()
    db.prepare("INSERT INTO customers (name, headquarters_address, headquarter_contacts, project_manager_id, sales_manager_id, project_engineer_id, created_at, updated_at) VALUES ('Cust','Addr','Contacts',1,1,1,1,1)").run()
    db.prepare("INSERT INTO customer_facilities (customer_id, plant_name, plant_address, plant_contacts, created_at, updated_at) VALUES (1,'Plant','Addr','Contacts',1,1)").run()

    const projectId = seedProject(db)

    createTemplateRow(db, { project_type: 1, milestone_code: 'PIH', label: 'PIH', sequence: 1, required: 1 })

    const seeded = seedMilestonesFromTemplate(db, projectId, 1)
    assert.equal(seeded.ok, true)
    assert.equal(seeded.inserted, 1)

    const listed = listMilestonesByProject(db, projectId)
    assert.equal(listed.ok, true)
    assert.equal(listed.data.length, 1)

    const updated = updateMilestoneRow(db, listed.data[0].id, { milestone_status: 'done' })
    assert.equal(updated.ok, true)
})
