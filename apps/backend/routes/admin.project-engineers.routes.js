import express from 'express'
import {
    createProjectEngineer,
    updateProjectEngineer,
    deleteProjectEngineer
} from '../repositories/project-engineers.repo.js'

const router = express.Router()

router.post('/admin/project-engineers', (req, res) => {
    try {
        const result = createProjectEngineer(req.db, req.body)
        if (!result.ok) {
            const statusCode = result.error === 'project engineer already exists'
                ? 409
                : result.error.startsWith('database error')
                    ? 500
                    : 400
            return res.status(statusCode).json(result)
        }
        return res.status(201).json(result)
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' })
    }
})

router.patch('/admin/project-engineers/:id', (req, res) => {
    try {
        const result = updateProjectEngineer(req.db, req.params.id, req.body)
        if (!result.ok) {
            const statusCode = result.error === 'project engineer not found'
                ? 404
                : result.error === 'project engineer already exists'
                    ? 409
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

router.delete('/admin/project-engineers/:id', (req, res) => {
    try {
        const result = deleteProjectEngineer(req.db, req.params.id)
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
