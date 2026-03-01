import express from 'express'
import {
    createSalesManager,
    updateSalesManager,
    deleteSalesManager
} from '../repositories/sales-managers.repo.js'

const router = express.Router()

router.post('/admin/sales-managers', (req, res) => {
    try {
        const result = createSalesManager(req.db, req.body)
        if (!result.ok) {
            const statusCode = result.error === 'sales manager already exists'
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

router.patch('/admin/sales-managers/:id', (req, res) => {
    try {
        const result = updateSalesManager(req.db, req.params.id, req.body)
        if (!result.ok) {
            const statusCode = result.error === 'sales manager not found'
                ? 404
                : result.error === 'sales manager already exists'
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

router.delete('/admin/sales-managers/:id', (req, res) => {
    try {
        const result = deleteSalesManager(req.db, req.params.id)
        if (!result.ok) {
            const statusCode = result.error === 'sales manager not found'
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
