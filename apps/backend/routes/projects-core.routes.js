import express from 'express'
import {
    createProjectCore,
    updateProjectCore,
    deleteProjectCore,
    getProjectCoreById,
    getProjectsByOrderId
} from '../repositories/projectsCore.repo.js'

const router = express.Router()

function mapErrorToStatus(error) {
    if (!error) return 400
    if (error === 'project not found') return 404
    if (error === 'order not found') return 404
    if (error.endsWith('not found')) return 404
    if (error === 'project already exists') return 409
    if (error.startsWith('database error')) return 500
    return 400
}

router.post('/projects-core', (req, res) => {
    const result = createProjectCore(req.db, req.body)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(201).json(result)
})

router.get('/projects-core/:id', (req, res) => {
    const result = getProjectCoreById(req.db, req.params.id)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.get('/projects-core/order/:order_id', (req, res) => {
    const result = getProjectsByOrderId(req.db, req.params.order_id)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.patch('/projects-core/:id', (req, res) => {
    const result = updateProjectCore(req.db, req.params.id, req.body)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.delete('/projects-core/:id', (req, res) => {
    const result = deleteProjectCore(req.db, req.params.id)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

export default router
