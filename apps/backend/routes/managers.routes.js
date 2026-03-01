import express from 'express'
import {
    getAllProjectManagers,
    getProjectManagerByUsername,
    getProjectManagerById,
} from '../repositories/project-managers.repo.js'

/**
 * Manager read-only routes.
 *
 * Base path: `/api`
 * Responsibility: public manager retrieval endpoints.
 * Dependency: expects `req.db` to be attached by app middleware.
 */

const router = express.Router()

/**
 * GET /managers
 * Returns all managers.
 */
router.get('/managers', (req, res) => {
    try {
        const result = getAllProjectManagers(req.db)
        if (!result.ok) {
            const statusCode = result.error.startsWith('database error') ? 500 : 400;
            return res.status(statusCode).json(result)
        }
        res.json(result.data);
    }
    catch (err) {
        console.error(`Fetch Error: ${err}`);
        res.status(500).json({ error: "Failed to retrieve managers" });
    }
})

/**
 * GET /manager/name/:name
 * Returns one manager by username.
 */
router.get('/manager/name/:name',(req, res) =>{
    const { name } = req.params
    try {
        const result = getProjectManagerByUsername(req.db, name)
        if (!result.ok) {
            const statusCode = result.error === 'manager not found'
                ? 404
                : result.error.startsWith('database error')
                    ? 500
                    : 400;
            return res.status(statusCode).json(result)
        }
        res.json(result.data)
    }
    catch (err) {
        console.error(`Fetch Error: ${err}`)
        res.status(500).json({ error: err.message })
    }
})

/**
 * GET /manager/id/:id
 * Returns one manager by id.
 */
router.get('/manager/id/:id', (req, res) => {
    const { id } = req.params
    try {
        const result = getProjectManagerById(req.db, id)
        if (!result.ok) {
            const statusCode = result.error === 'manager not found'
                ? 404
                : result.error.startsWith('database error')
                    ? 500
                    : 400;
            return res.status(statusCode).json(result)
        }
        res.json(result.data)
    }
    catch (err) {
        console.error(`Fetch Error: ${err}`)
        res.status(500).json({ error: err.message })
    }
})

export default router;
