import Database from 'better-sqlite3'
import projectManagerSchema from '../../db/schema/project_manager.schema.js'
import salesManagerSchema from '../../db/schema/sales_manager.schema.js'
import projectEngineerSchema from '../../db/schema/project_engineer.schema.js'
import operationsSchema from '../../db/schema/operations_molds.schema.js'
import operationsLookupQueueSchema from '../../db/schema/operations_lookup_queue.schema.js'
import customerSchema from '../../db/schema/customer.schema.js'
import customerFacilitiesSchema from '../../db/schema/customer_facility.schema.js'
import ordersSchema from '../../db/schema/order.schema.js'
import projectsCoreSchema from '../../db/schema/project_core.schema.js'
import projectMilestoneTemplateSchema from '../../db/schema/project_milestone_template.schema.js'
import projectMilestoneSchema from '../../db/schema/project_milestone.schema.js'
import pdfScanJobsSchema from '../../db/schema/pdf_scan_jobs.schema.js'
import pdfScanResultsSchema from '../../db/schema/pdf_scan_results.schema.js'

export function createTestDb() {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    db.prepare(projectManagerSchema).run()
    db.prepare(salesManagerSchema).run()
    db.prepare(projectEngineerSchema).run()
    db.prepare(operationsSchema).run()
    db.prepare(operationsLookupQueueSchema).run()
    db.prepare(customerSchema).run()
    db.prepare(customerFacilitiesSchema).run()
    db.prepare(ordersSchema).run()
    db.prepare(projectsCoreSchema).run()
    db.prepare(projectMilestoneTemplateSchema).run()
    db.prepare(projectMilestoneSchema).run()
    db.prepare(pdfScanJobsSchema).run()
    db.prepare(pdfScanResultsSchema).run()
    return db
}
