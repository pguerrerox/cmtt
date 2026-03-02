import express from 'express'
import {
    createOrder,
    updateOrder,
    deleteOrder,
    getAllOrders,
    getOrderById,
    getOrderByNumber
} from '../repositories/orders.repo.js'

const router = express.Router()

function mapErrorToStatus(error) {
    if (!error) return 400
    if (error === 'order not found') return 404
    if (error.endsWith('not found')) return 404
    if (error === 'order already exists') return 409
    if (error.startsWith('database error')) return 500
    return 400
}

router.post('/orders', (req, res) => {
    const result = createOrder(req.db, req.body)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(201).json(result)
})

router.get('/orders', (req, res) => {
    const result = getAllOrders(req.db)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.get('/orders/:id', (req, res) => {
    const result = getOrderById(req.db, req.params.id)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.get('/orders/number/:order_number', (req, res) => {
    const result = getOrderByNumber(req.db, req.params.order_number)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.patch('/orders/:id', (req, res) => {
    const result = updateOrder(req.db, req.params.id, req.body)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.delete('/orders/:id', (req, res) => {
    const result = deleteOrder(req.db, req.params.id)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

export default router
