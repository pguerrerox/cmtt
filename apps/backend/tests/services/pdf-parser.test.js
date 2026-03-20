import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDraftFromPages, extractProjectsForTest } from '../../services/pdf-scanner/pdf-parser.js'

test('extractProjectsForTest parses ops project number, description, and sales price from detail rows', () => {
    const detailLines = [
        'Page 3 of 6',
        'Sales order lines',
        '1.000 No Open order 1.00 PM1174 1372075',
        '1',
        '818275 HyPET 4.0 48 Full Molds / 24',
        '75x170HyPET4.0 Mold',
        'OPN:',
        '409,582 296,693 296,693 27.56% Submit Shipping',
        'Hold',
        'Oct 13, 2025 71710 HyPET 4.0 48',
        'Full Molds',
        'Price and discount'
    ]

    const rows = extractProjectsForTest(detailLines)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].project_number, '818275')
    assert.match(rows[0].project_description, /HyPET 4\.0 48 Full Molds/i)
    assert.equal(rows[0].sales_price, 29669300)
    assert.equal(rows[0].accepted, true)
})

test('buildDraftFromPages only uses detail pages for project lines', () => {
    const pages = [
        {
            pageNumber: 1,
            lines: [
                'Sales Order: CA01-433007',
                'Created Date: Mar 02, 2026',
                'Project Name: Header Should Not Be Used'
            ]
        },
        {
            pageNumber: 2,
            lines: [
                'Sales order lines',
                '1.000 No Open order 1.00 PM1174 1372075 818275 HyPET 4.0 48 Full Molds / 24 75x170HyPET4.0 Mold 409,582 296,693 296,693',
                'Price and discount'
            ]
        }
    ]

    const result = buildDraftFromPages(pages)

    assert.equal(result.errors.length, 0)
    assert.equal(result.draft.projects.length, 1)
    assert.equal(result.draft.projects[0].project_number, '818275')
    assert.equal(result.draft.projects[0].sales_price, 29669300)
    assert.ok(!result.draft.projects.some((row) => /Header Should Not Be Used/i.test(row.project_description)))
})
