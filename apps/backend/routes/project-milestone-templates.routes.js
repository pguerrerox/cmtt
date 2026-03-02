import express from 'express'
import {
    createTemplateRow,
    updateTemplateRow,
    deleteTemplateRow,
    listTemplateByType,
    cloneTemplateVersion
} from '../repositories/projectMilestoneTemplates.repo.js'

const router = express.Router()

function mapErrorToStatus(error) {
    if (!error) return 400
    if (error.endsWith('not found')) return 404
    if (error === 'template row already exists' || error === 'target template version already exists') return 409
    if (error.startsWith('database error')) return 500
    return 400
}

router.get('/project-milestone-templates/:project_type', (req, res) => {
    const templateVersion = req.query.template_version ? Number(req.query.template_version) : 1
    const active = req.query.active ? Number(req.query.active) : 1
    const result = listTemplateByType(req.db, Number(req.params.project_type), templateVersion, active)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.post('/project-milestone-templates', (req, res) => {
    const result = createTemplateRow(req.db, req.body)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(201).json(result)
})

router.patch('/project-milestone-templates/:id', (req, res) => {
    const result = updateTemplateRow(req.db, req.params.id, req.body)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.delete('/project-milestone-templates/:id', (req, res) => {
    const result = deleteTemplateRow(req.db, req.params.id)
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.post('/project-milestone-templates/:project_type/clone', (req, res) => {
    const { from_version, to_version } = req.body ?? {}
    const result = cloneTemplateVersion(
        req.db,
        Number(req.params.project_type),
        Number(from_version),
        Number(to_version)
    )
    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(201).json(result)
})

export default router
