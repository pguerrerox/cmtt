import express from 'express'
import multer from 'multer'
import { commitPdfDraft, scanPdf } from '../services/pdf-scanner/pdf-scanner.service.js'

const router = express.Router()

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter(req, file, callback) {
        const isPdf = file.mimetype === 'application/pdf' || String(file.originalname ?? '').toLowerCase().endsWith('.pdf')
        if (!isPdf) {
            callback(new Error('only PDF files are allowed'))
            return
        }
        callback(null, true)
    }
})

function mapErrorToStatus(error) {
    if (!error) return 400
    if (error.includes('not found')) return 404
    if (error.includes('invalid')) return 400
    if (error.includes('required')) return 400
    if (error.includes('already exists')) return 409
    if (error.startsWith('database error')) return 500
    if (error.startsWith('pdf scan failed')) return 422
    return 400
}

router.post('/pdf/scan', upload.single('pdf'), async (req, res) => {
    const result = await scanPdf(req.db, req.file, {
        actor: req.body?.uploaded_by ?? null
    })

    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(200).json(result)
})

router.post('/pdf/commit', (req, res) => {
    const result = commitPdfDraft(req.db, req.body, {
        actor: req.body?.committed_by ?? null
    })

    if (!result.ok) return res.status(mapErrorToStatus(result.error)).json(result)
    return res.status(result.idempotent_reuse ? 200 : 201).json(result)
})

export default router
