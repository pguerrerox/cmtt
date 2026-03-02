import express from 'express'
import { getAllSalesManagers, getSalesManagerById } from '../repositories/sales-managers.repo.js'

const router = express.Router()

router.get('/sales-managers', (req, res) => {
    try {
        const result = getAllSalesManagers(req.db)
        if (!result.ok) {
            const statusCode = result.error.startsWith('database error') ? 500 : 400
            return res.status(statusCode).json(result)
        }
        return res.status(200).json(result)
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' })
    }
})

router.get('/sales-managers/:id', (req, res) => {
    try {
        const result = getSalesManagerById(req.db, req.params.id)
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
