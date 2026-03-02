import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import admins from './routes/admin.routes.js'
import adminSalesManagers from './routes/admin.sales-managers.routes.js'
import adminProjectEngineers from './routes/admin.project-engineers.routes.js'
import managers from './routes/managers.routes.js'
import salesManagers from './routes/sales-managers.routes.js'
import projectEngineers from './routes/project-engineers.routes.js'
import customers from './routes/customers.routes.js'
import customerFacilities from './routes/customer-facilities.routes.js'
import orders from './routes/orders.routes.js'
import projectsCore from './routes/projects-core.routes.js'
import projectMilestones from './routes/project-milestones.routes.js'
import projectMilestoneTemplates from './routes/project-milestone-templates.routes.js'

/**
 * Creates and configures the Express application instance.
 *
 * Attaches JSON and cookie parsing middleware, injects the shared database
 * connection into each request as `req.db`, and mounts API routes under `/api`.
 *
 * @param {import('better-sqlite3').Database} db - Shared SQLite database connection.
 * @returns {import('express').Express} Configured Express application.
 */
export default function createApp(db) {
    const app = express()

    const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)

    const allowedOrigins = new Set([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
        ...configuredOrigins
    ])

    app.use(express.json())
    app.use(cors({
        credentials: true,
        origin(origin, callback) {
            if (!origin || allowedOrigins.has(origin)) {
                return callback(null, true)
            }
            return callback(new Error('CORS origin not allowed'))
        }
    }))
    app.use(cookieParser())
    app.use((req, res, next) => {
        req.db = db
        next()
    })

    app.use(
        '/api',
        admins,
        adminSalesManagers,
        adminProjectEngineers,
        managers,
        salesManagers,
        projectEngineers,
        customers,
        customerFacilities,
        orders,
        projectsCore,
        projectMilestones,
        projectMilestoneTemplates
    )

    return app
}
