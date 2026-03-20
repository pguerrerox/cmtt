import { z } from 'zod'

const pdfOrderSchema = z.object({
    type: z.number().int().min(0).max(1),
    order_number: z.string().regex(/^[A-Za-z]{2}\d{2}-\d{6}$/),
    order_received_date: z.number().int().positive(),
    project_manager_id: z.number().int().positive(),
    sales_manager_id: z.number().int().positive(),
    project_engineer_id: z.number().int().positive(),
    ship_to_facility_id: z.number().int().positive(),
    customer_id: z.number().int().positive(),
    quote_ref: z.string().min(1),
    po_ref: z.string().nullable().optional(),
    payment_terms: z.string().min(1),
    delivery_terms: z.string().min(1),
    penalty: z.number().int().min(0).max(1),
    penalty_notes: z.string().nullable().optional()
})

const pdfProjectLineSchema = z.object({
    project_number: z.string().regex(/^\d{6}$/),
    project_description: z.string().min(1),
    type: z.number().int().min(1).max(3)
})

export const pdfScanDraftSchema = z.object({
    order: pdfOrderSchema,
    projects: z.array(pdfProjectLineSchema).min(1),
    metadata: z.object({
        source: z.literal('pdf'),
        template_version: z.string().min(1),
        confidence: z.number().min(0).max(1)
    })
})

export function validatePdfDraft(draft) {
    const result = pdfScanDraftSchema.safeParse(draft)
    if (result.success) return { ok: true, data: result.data }
    const issues = result.error.issues.map((issue) => {
        const path = issue.path.join('.')
        return path ? `${path}: ${issue.message}` : issue.message
    })
    return { ok: false, error: 'invalid pdf draft', issues }
}
