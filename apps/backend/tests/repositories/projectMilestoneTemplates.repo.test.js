import test from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from '../helpers/test-db.js'
import {
    createTemplateRow,
    listTemplateByType,
    cloneTemplateVersion
} from '../../repositories/projectMilestoneTemplates.repo.js'

test('milestone templates repo creates and lists template rows', () => {
    const db = createTestDb()

    const created = createTemplateRow(db, {
        project_type: 3,
        milestone_code: 'MIH',
        label: 'MIH',
        sequence: 1,
        required: 1
    })

    assert.equal(created.ok, true)
    const listed = listTemplateByType(db, 3)
    assert.equal(listed.ok, true)
    assert.equal(listed.data.length, 1)
    assert.equal(listed.data[0].milestone_code, 'MIH')
})

test('milestone templates repo clones template version', () => {
    const db = createTestDb()
    createTemplateRow(db, {
        project_type: 1,
        milestone_code: 'PIH',
        label: 'PIH',
        sequence: 1,
        required: 1,
        template_version: 1
    })

    const cloned = cloneTemplateVersion(db, 1, 1, 2)
    assert.equal(cloned.ok, true)

    const v2 = listTemplateByType(db, 1, 2)
    assert.equal(v2.ok, true)
    assert.equal(v2.data.length, 1)
    assert.equal(v2.data[0].template_version, 2)
})
