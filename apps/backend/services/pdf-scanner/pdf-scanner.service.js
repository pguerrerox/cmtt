import crypto from 'crypto'
import { createPdfScanJob, getPdfScanJobById, updatePdfScanJob } from '../../repositories/pdf-scan-jobs.repo.js'
import { createPdfScanResult, getLatestPdfScanResultByJobId } from '../../repositories/pdf-scan-results.repo.js'
import { getRelatedProjectRecommendations } from './recommendations.service.js'
import { parsePdfBuffer } from './pdf-parser.js'
import { validatePdfDraft } from './pdf-scanner.schemas.js'
import { createOrder, getOrderById, getOrderByNumber } from '../../repositories/orders.repo.js'
import { createProjectCore, getProjectsByOrderId } from '../../repositories/projectsCore.repo.js'

function stableCopy(value) {
    if (Array.isArray(value)) return value.map((item) => stableCopy(item))
    if (value && typeof value === 'object') {
        const out = {}
        for (const key of Object.keys(value).sort()) {
            out[key] = stableCopy(value[key])
        }
        return out
    }
    return value
}

function createFingerprint(draft) {
    const normalized = JSON.stringify(stableCopy(draft))
    return crypto.createHash('sha256').update(normalized).digest('hex')
}

function toActor(value) {
    if (value === null || value === undefined) return null
    const text = String(value).trim()
    return text || null
}

export async function scanPdf(db, file, options = {}) {
    if (!file?.buffer) return { ok: false, error: 'pdf file is required' }

    const actor = toActor(options.actor)
    const createJobResult = createPdfScanJob(db, {
        uploaded_by: actor,
        original_filename: file.originalname ?? 'upload.pdf',
        mime_type: file.mimetype ?? 'application/pdf',
        file_size: file.size ?? file.buffer.length,
        status: 'processing'
    })

    if (!createJobResult.ok) return createJobResult

    const scanJobId = createJobResult.id

    try {
        const parsed = await parsePdfBuffer(file.buffer)
        const fingerprint = createFingerprint(parsed.draft)
        const recommendations = getRelatedProjectRecommendations(db, parsed.draft)

        const storeResult = createPdfScanResult(db, {
            scan_job_id: scanJobId,
            draft: parsed.draft,
            warnings: parsed.warnings,
            errors: parsed.errors,
            recommendations,
            fingerprint
        })

        if (!storeResult.ok) {
            updatePdfScanJob(db, scanJobId, {
                status: 'failed',
                error_message: storeResult.error
            })
            return storeResult
        }

        updatePdfScanJob(db, scanJobId, {
            status: parsed.errors.length > 0 ? 'failed' : 'scanned',
            template_version: parsed.templateVersion,
            parse_confidence: parsed.confidence,
            error_message: parsed.errors.length > 0 ? parsed.errors.join('; ') : null
        })

        return {
            ok: true,
            scan_job_id: scanJobId,
            template_version: parsed.templateVersion,
            confidence: parsed.confidence,
            draft: parsed.draft,
            warnings: parsed.warnings,
            errors: parsed.errors,
            recommendations,
            fingerprint
        }
    }
    catch (err) {
        updatePdfScanJob(db, scanJobId, {
            status: 'failed',
            error_message: err.message
        })
        return { ok: false, error: `pdf scan failed: ${err.message}` }
    }
}

function findExistingCommitByOrderNumber(db, orderNumber) {
    const existing = getOrderByNumber(db, orderNumber)
    if (!existing.ok) return null
    const projects = getProjectsByOrderId(db, existing.data.id)
    return {
        order: existing.data,
        projects: projects.ok ? projects.data : []
    }
}

export function commitPdfDraft(db, payload, options = {}) {
    const actor = toActor(options.actor)
    const scanJobId = payload?.scan_job_id
    let draft = payload?.draft

    if (scanJobId) {
        const jobResult = getPdfScanJobById(db, scanJobId)
        if (!jobResult.ok) return { ok: false, error: jobResult.error }

        if (jobResult.data.status === 'committed' && jobResult.data.committed_order_id) {
            const orderResult = getOrderById(db, jobResult.data.committed_order_id)
            const projectsResult = getProjectsByOrderId(db, jobResult.data.committed_order_id)
            if (orderResult.ok) {
                return {
                    ok: true,
                    idempotent_reuse: true,
                    order_id: orderResult.data.id,
                    project_ids: (projectsResult.ok ? projectsResult.data : []).map((row) => row.id),
                    lookup_statuses: (projectsResult.ok ? projectsResult.data : []).map(() => 'existing')
                }
            }
        }

        if (!draft) {
            const latestResult = getLatestPdfScanResultByJobId(db, scanJobId)
            if (!latestResult.ok) return { ok: false, error: latestResult.error }
            draft = latestResult.data.draft
        }
    }

    if (!draft) return { ok: false, error: 'draft is required' }

    const validation = validatePdfDraft(draft)
    if (!validation.ok) {
        return {
            ok: false,
            error: validation.error,
            issues: validation.issues
        }
    }

    const canonicalDraft = validation.data
    const existingCommit = findExistingCommitByOrderNumber(db, canonicalDraft.order.order_number)
    if (existingCommit) {
        if (scanJobId) {
            updatePdfScanJob(db, scanJobId, {
                status: 'committed',
                committed_order_id: existingCommit.order.id,
                committed_at: Date.now()
            })
        }

        return {
            ok: true,
            idempotent_reuse: true,
            order_id: existingCommit.order.id,
            project_ids: existingCommit.projects.map((row) => row.id),
            lookup_statuses: existingCommit.projects.map(() => 'existing')
        }
    }

    const tx = db.transaction(() => {
        const orderResult = createOrder(db, canonicalDraft.order, actor)
        if (!orderResult.ok) throw new Error(orderResult.error)

        const projectIds = []
        const lookupStatuses = []
        for (const line of canonicalDraft.projects) {
            const projectResult = createProjectCore(db, {
                order_id: orderResult.id,
                project_number: line.project_number,
                project_description: line.project_description,
                type: line.type
            }, actor)

            if (!projectResult.ok) throw new Error(projectResult.error)
            projectIds.push(projectResult.id)
            lookupStatuses.push(projectResult.lookup_status)
        }

        if (scanJobId) {
            const updateResult = updatePdfScanJob(db, scanJobId, {
                status: 'committed',
                committed_order_id: orderResult.id,
                committed_at: Date.now()
            })
            if (!updateResult.ok) throw new Error(updateResult.error)
        }

        return {
            ok: true,
            idempotent_reuse: false,
            order_id: orderResult.id,
            project_ids: projectIds,
            lookup_statuses: lookupStatuses,
            fingerprint: createFingerprint(canonicalDraft)
        }
    })

    try {
        return tx()
    }
    catch (err) {
        return { ok: false, error: `commit failed: ${err.message}` }
    }
}
