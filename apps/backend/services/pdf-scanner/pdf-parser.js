import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const TYPE_MAP = {
    machine: 1,
    auxiliary: 2,
    aux: 2,
    mold: 3,
    mould: 3
}

function normalizeWhitespace(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function toEpochFromDateText(value) {
    const text = normalizeWhitespace(value)
    if (!text) return null

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const time = Date.parse(`${text}T00:00:00Z`)
        return Number.isNaN(time) ? null : time
    }

    const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (slashMatch) {
        const month = Number(slashMatch[1])
        const day = Number(slashMatch[2])
        const year = Number(slashMatch[3])
        const parsed = new Date(Date.UTC(year, month - 1, day)).getTime()
        return Number.isNaN(parsed) ? null : parsed
    }

    const parsed = Date.parse(text)
    return Number.isNaN(parsed) ? null : parsed
}

function extractLabel(lines, patterns) {
    for (const line of lines) {
        for (const pattern of patterns) {
            const match = line.match(pattern)
            if (match?.[1]) return normalizeWhitespace(match[1])
        }
    }
    return ''
}

function parseProjectType(value) {
    const normalized = normalizeWhitespace(value).toLowerCase()
    if (!normalized) return null
    if (/^[123]$/.test(normalized)) return Number(normalized)
    return TYPE_MAP[normalized] ?? null
}

function extractByRegex(text, pattern) {
    const match = text.match(pattern)
    return match?.[1] ? normalizeWhitespace(match[1]) : ''
}

function inferProjectTypeFromDescription(value) {
    const text = normalizeWhitespace(value).toLowerCase()
    if (!text) return 1
    if (text.includes('mold') || text.includes('mould')) return 3
    if (text.includes('aux')) return 2
    return 1
}

function cleanProjectDescription(value) {
    const normalized = normalizeWhitespace(value)
    if (!normalized) return ''
    const stopMarkers = [
        ' REGIONAL CREDITS',
        ' PROJECT MANAGER',
        ' LINE OF BUSINESS',
        ' PLACE OF DELIVERY',
        ' DELIVERY TERMS',
        ' CREATED DATE'
    ]

    let cut = normalized.length
    const upper = normalized.toUpperCase()
    for (const marker of stopMarkers) {
        const index = upper.indexOf(marker)
        if (index >= 0 && index < cut) cut = index
    }

    return normalizeWhitespace(normalized.slice(0, cut))
}

function extractProjectLines(lines) {
    const rows = []
    const linePattern = /^(\d{6})\s+(.+?)\s+(Machine|Auxiliary|Aux|Mold|Mould|[123])$/i

    for (const line of lines) {
        const match = line.match(linePattern)
        if (!match) continue
        const type = parseProjectType(match[3])
        if (!type) continue
        rows.push({
            project_number: match[1],
            project_description: normalizeWhitespace(match[2]),
            type
        })
    }

    return rows
}

function extractProjectLineFromHeader(lines, fullText) {
    const projectNumber = extractByRegex(fullText, /\bproject\s*id\s*[:\-]?\s*(\d{6})\b/i)
        || extractLabel(lines, [
            /project\s*id\s*[:\-]?\s*(\d{6})$/i
        ])
    const projectDescription = extractByRegex(fullText, /\bproject\s*name\s*[:\-]?\s*(.+?)\s+project\s*manager\b/i)
        || extractLabel(lines, [
            /project\s*name\s*[:\-]?\s*(.+)$/i
        ])

    const cleanedDescription = cleanProjectDescription(projectDescription)
    if (!projectNumber || !cleanedDescription) return []
    return [{
        project_number: projectNumber,
        project_description: cleanedDescription,
        type: inferProjectTypeFromDescription(cleanedDescription)
    }]
}

function groupTextItemsIntoLines(items) {
    const sorted = [...items].sort((a, b) => {
        if (Math.abs(a.y - b.y) > 1.5) return b.y - a.y
        return a.x - b.x
    })

    const groups = []
    for (const item of sorted) {
        const candidate = groups.find((group) => Math.abs(group.y - item.y) <= 1.5)
        if (candidate) {
            candidate.items.push(item)
            continue
        }
        groups.push({ y: item.y, items: [item] })
    }

    const lines = groups
        .map((group) => group.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(' '))
        .map((line) => normalizeWhitespace(line))
        .filter(Boolean)

    return lines
}

async function extractLines(buffer) {
    const loadingTask = getDocument({ data: new Uint8Array(buffer) })
    const pdf = await loadingTask.promise
    const allLines = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const content = await page.getTextContent()
        const items = content.items
            .map((item) => ({
                text: normalizeWhitespace(item.str),
                x: item.transform?.[4] ?? 0,
                y: item.transform?.[5] ?? 0
            }))
            .filter((item) => item.text)

        allLines.push(...groupTextItemsIntoLines(items))
    }

    return allLines
}

function buildDraft(lines) {
    const fullText = normalizeWhitespace(lines.join(' '))
    const orderNumber = extractByRegex(fullText, /\bsales\s*order\s*[:\-]?\s*([A-Za-z]{2}\d{2}-\d{6})\b/i)
        || extractLabel(lines, [
        /sales\s*order\s*[:\-]?\s*([A-Za-z]{2}\d{2}-\d{6})$/i,
        /order\s*number\s*[:\-]\s*(.+)$/i,
        /order\s*#\s*[:\-]?\s*(.+)$/i
    ])
    const receivedDateText = extractByRegex(fullText, /\bcreated\s*date\s*[:\-]?\s*([A-Za-z]{3}\s+\d{1,2},\s+\d{4})\b/i)
        || extractLabel(lines, [
        /created\s*date\s*[:\-]?\s*([A-Za-z]{3}\s+\d{1,2},\s+\d{4})$/i,
        /received\s*date\s*[:\-]\s*(.+)$/i,
        /order\s*date\s*[:\-]?\s*(.+)$/i
    ])
    const quoteRef = extractByRegex(fullText, /\bquote\s*(?:ref|no\.?|number)?\s*[:\-]?\s*([A-Za-z0-9-]{4,})\b/i)
        || extractLabel(lines, [
        /quote\s*(?:ref|no\.?|number)?\s*[:\-]?\s*(.+)$/i
    ])
    const poRef = extractByRegex(fullText, /\bcustomer\s*po\s*[:\-]?\s*([A-Za-z0-9-]{3,})\b/i)
        || extractLabel(lines, [
        /customer\s*po\s*[:\-]?\s*(.+)$/i,
        /p(?:urchase)?\s*o(?:rder)?\s*(?:ref|no\.?|number)?\s*[:\-]?\s*(.+)$/i
    ])
    const paymentTerms = extractLabel(lines, [
        /payment\s*terms\s*[:\-]?\s*(.+)$/i,
        /customer\s*terms\s*[:\-]?\s*(.+)$/i
    ])
    const deliveryTerms = extractLabel(lines, [
        /delivery\s*terms\s*[:\-]?\s*(.+)$/i
    ])
    const projects = extractProjectLines(lines)
    const projectRows = projects.length > 0 ? projects : extractProjectLineFromHeader(lines, fullText)

    const errors = []
    const warnings = []

    if (!orderNumber) errors.push('order_number not found in PDF text')
    if (!receivedDateText) warnings.push('order_received_date not found; please edit before commit')
    if (projectRows.length === 0) errors.push('no project lines matched the expected PDF row pattern')

    const parsedDate = toEpochFromDateText(receivedDateText)
    if (receivedDateText && !parsedDate) {
        warnings.push('order_received_date could not be parsed; please edit before commit')
    }

    const draft = {
        order: {
            type: 0,
            order_number: orderNumber,
            order_received_date: parsedDate ?? Date.now(),
            project_manager_id: 0,
            sales_manager_id: 0,
            project_engineer_id: 0,
            ship_to_facility_id: 0,
            customer_id: 0,
            quote_ref: quoteRef,
            po_ref: poRef || null,
            payment_terms: paymentTerms,
            delivery_terms: deliveryTerms,
            penalty: 0,
            penalty_notes: null
        },
        projects: projectRows,
        metadata: {
            source: 'pdf',
            template_version: 'pdf_v1',
            confidence: 0.65
        }
    }

    return { draft, warnings, errors, templateVersion: 'pdf_v1', confidence: 0.65 }
}

export async function parsePdfBuffer(buffer) {
    if (!buffer || buffer.length === 0) {
        throw new Error('empty PDF payload')
    }

    const lines = await extractLines(buffer)
    if (lines.length === 0) {
        return {
            draft: {
                order: {
                    type: 0,
                    order_number: '',
                    order_received_date: Date.now(),
                    project_manager_id: 0,
                    sales_manager_id: 0,
                    project_engineer_id: 0,
                    ship_to_facility_id: 0,
                    customer_id: 0,
                    quote_ref: '',
                    po_ref: null,
                    payment_terms: '',
                    delivery_terms: '',
                    penalty: 0,
                    penalty_notes: null
                },
                projects: [],
                metadata: {
                    source: 'pdf',
                    template_version: 'pdf_v1',
                    confidence: 0
                }
            },
            warnings: [],
            errors: ['unable to extract readable text from PDF'],
            templateVersion: 'pdf_v1',
            confidence: 0
        }
    }

    return buildDraft(lines)
}
