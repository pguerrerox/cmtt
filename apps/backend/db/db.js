import dotenv from 'dotenv'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import projectManagerSchema from './schema/project_manager.schema.js'
import salesManagerSchema from './schema/sales_manager.schema.js'
import projectEngineerSchema from './schema/project_engineer.schema.js'
import operationsSchema from './schema/operations_molds.schema.js'
import operationsLookupQueueSchema from './schema/operations_lookup_queue.schema.js'
import customerSchema from './schema/customer.schema.js'
import facilitySchema from './schema/customer_facility.schema.js'
import ordersSchema from './schema/order.schema.js'
import projectsCoreSchema from './schema/project_core.schema.js'
import projectMilestoneTemplateSchema from './schema/project_milestone_template.schema.js'
import projectMilestoneSchema from './schema/project_milestone.schema.js'
import pdfScanJobsSchema from './schema/pdf_scan_jobs.schema.js'
import pdfScanResultsSchema from './schema/pdf_scan_results.schema.js'

/**
 * Database bootstrap module.
 *
 * Loads environment configuration, opens the SQLite database connection,
 * enables foreign keys, and initializes required tables.
 */

// Load environment variables early for DB_PATH
dotenv.config()

// Prepare filepath for Database
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Absolute filesystem path to the SQLite database file.
 *
 * Uses `DB_PATH` when provided, resolved relative to this module.
 * @type {string}
 */
const dbPath = path.resolve(__dirname, process.env.DB_PATH ?? 'databases/dev_main.db')
console.log(`\nDB-> Path: ${dbPath}`)

// Create database if it doesn't exist
/**
 * Shared SQLite database connection used by the application.
 *
 * @type {import('better-sqlite3').Database}
 */
const db = new Database(dbPath)
console.log(`DB-> Database is connected`)

// Support for foraign keys - ON
db.pragma('foreign_keys = ON');

// Initialize SQLite tables using better-sqlite3
db.prepare(projectManagerSchema).run()
console.log('DB-> Project managers table initialized')

db.prepare(salesManagerSchema).run()
console.log('DB-> Sales managers table initialized')

db.prepare(projectEngineerSchema).run()
console.log('DB-> Project engineers table initialized')

db.prepare(operationsSchema).run()
console.log('DB-> Operations planned dates table initialized')

db.prepare(operationsLookupQueueSchema).run()
console.log('DB-> Operations lookup queue table initialized')

db.prepare(customerSchema).run()
console.log('DB-> Customers table initialized')

db.prepare(facilitySchema).run()
console.log('DB-> Customer facilities table initialized')

db.prepare(ordersSchema).run()
console.log('DB-> Orders table initialized')

db.prepare(projectsCoreSchema).run()
console.log('DB-> Projects core table initialized')

db.prepare(projectMilestoneTemplateSchema).run()
console.log('DB-> Project milestone templates table initialized')

db.prepare(projectMilestoneSchema).run()
console.log('DB-> Project milestones table initialized')

db.prepare(pdfScanJobsSchema).run()
console.log('DB-> PDF scan jobs table initialized')

db.prepare(pdfScanResultsSchema).run()
console.log('DB-> PDF scan results table initialized')

export default db
