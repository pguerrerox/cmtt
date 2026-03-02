import express from 'express'
import { getAllProjectEngineers, getProjectEngineerById } from '../repositories/project-engineers.repo.js'

const router = express.Router()

router.get('/project-engineers', (req, res) => {
    try {
        const result = getAllProjectEngineers(req.db)
        if (!result.ok) {
            const statusCode = result.error.startsWith('database error') ? 500 : 400
            return res.status(statusCode).json(result)
        }
        return res.status(200).json(result)
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' })
    }
})

router.get('/project-engineers/:id', (req, res) => {
    try {
        const result = getProjectEngineerById(req.db, req.params.id)
        if (!result.ok) {
            const statusCode = result.error === 'project engineer not found'
                ? 404
                : result.error.startsWith('database error')
                    ? 500
                    : 400
            return res.status(statusCode).json(result)
        }
        return res.status(200).json(result)
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' })
    }
})

export default router
