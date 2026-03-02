import express from 'express'
import {
    createMilestoneRow,
    updateMilestoneRow,
    deleteMilestoneRow,
    listMilestonesByProject
} from '../repositories/projectMilestones.repo.js'

const router = express.Router()

function mapErrorToStatus(error) {
    if (!error) return 400
    if (error.endsWith('not found')) return 404
    if (error.startsWith('database error')) return 500
    return 400
}

router.get('/projects-core/:project_id/milestones', (req, res) => {
    const result = listMilestonesByProject(req.db, req.params.project_id)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.post('/project-milestones', (req, res) => {
    const result = createMilestoneRow(req.db, req.body)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(201).json(result)
})

router.patch('/project-milestones/:id', (req, res) => {
    const result = updateMilestoneRow(req.db, req.params.id, req.body)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.delete('/project-milestones/:id', (req, res) => {
    const result = deleteMilestoneRow(req.db, req.params.id)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

export default router
