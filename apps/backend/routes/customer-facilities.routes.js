import express from 'express'
import {
    createCustomerFacility,
    updateCustomerFacility,
    deleteCustomerFacility,
    getAllCustomerFacilities,
    getCustomerFacilityById
} from '../repositories/customer-facilities.repo.js'

const router = express.Router()

router.post('/customer-facilities', (req, res) => {
    try {
        const result = createCustomerFacility(req.db, req.body)
        if (!result.ok) {
            const statusCode = result.error.startsWith('database error')
                ? 500
                : result.error === 'customer not found'
                    ? 404
                    : 400
            return res.status(statusCode).json(result)
        }
        return res.status(201).json(result)
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' })
    }
})

router.patch('/customer-facilities/:id', (req, res) => {
    try {
        const result = updateCustomerFacility(req.db, req.params.id, req.body)
        if (!result.ok) {
            const statusCode = result.error === 'facility not found'
                ? 404
                : result.error.startsWith('database error')
                    ? 500
                    : result.error === 'customer not found'
                        ? 404
                        : 400
            return res.status(statusCode).json(result)
        }
        return res.status(200).json(result)
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' })
    }
})

router.delete('/customer-facilities/:id', (req, res) => {
    try {
        const result = deleteCustomerFacility(req.db, req.params.id)
        if (!result.ok) {
            const statusCode = result.error === 'facility not found'
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

router.get('/customer-facilities', (req, res) => {
    try {
        const result = getAllCustomerFacilities(req.db)
        if (!result.ok) {
            const statusCode = result.error.startsWith('database error') ? 500 : 400
            return res.status(statusCode).json(result)
        }
        return res.status(200).json(result)
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' })
    }
})

router.get('/customer-facilities/:id', (req, res) => {
    try {
        const result = getCustomerFacilityById(req.db, req.params.id)
        if (!result.ok) {
            const statusCode = result.error === 'facility not found'
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
