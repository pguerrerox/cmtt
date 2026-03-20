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

function extractByRegex(text, pattern) {
    const match = text.match(pattern)
    return match?.[1] ? normalizeWhitespace(match[1]) : ''
}

function parseProjectType(value) {
    const normalized = normalizeWhitespace(value).toLowerCase()
    if (!normalized) return null
    if (/^[123]$/.test(normalized)) return Number(normalized)
    return TYPE_MAP[normalized] ?? null
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
        ' CREATED DATE',
        ' SUBMIT SHIPPING',
        ' HOLD',
        ' OPN:'
    ]

    let cut = normalized.length
    const upper = normalized.toUpperCase()
    for (const marker of stopMarkers) {
        const index = upper.indexOf(marker)
        if (index >= 0 && index < cut) cut = index
    }

    let cleaned = normalizeWhitespace(normalized.slice(0, cut))
    const firstMoneyIndex = cleaned.search(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/)
    if (firstMoneyIndex >= 0) {
        cleaned = cleaned.slice(0, firstMoneyIndex)
    }
    cleaned = cleaned.replace(/\s+\d{1,3}(?:,\d{3})+(?:\.\d+)?(\s+\d{1,3}(?:,\d{3})+(?:\.\d+)?)*\s*$/g, '')
    return normalizeWhitespace(cleaned)
}

function parseMoneyToCents(value) {
    const text = normalizeWhitespace(value)
    if (!text) return null

    const numeric = text.replace(/,/g, '')
    if (!/^\d+(?:\.\d{1,2})?$/.test(numeric)) return null

    const parts = numeric.split('.')
    const whole = Number(parts[0])
    const cents = parts[1] ? Number(parts[1].padEnd(2, '0')) : 0
    return whole * 100 + cents
}

function parseSalesPriceCents(rowText) {
    const amounts = rowText.match(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g) ?? []
    if (amounts.length === 0) return null
    const salesPriceToken = amounts[1] ?? amounts[0]
    return parseMoneyToCents(salesPriceToken)
}

function isNoiseLine(value) {
    const text = normalizeWhitespace(value)
    if (!text) return true
    return (
        /^Page\s+\d+\s+of\s+\d+$/i.test(text)
        || /^\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}\s+[AP]M$/i.test(text)
        || /^summary\s+order\s+report$/i.test(text)
        || /^OPN\s*:/i.test(text)
    )
}

function extractProjectFromRow(rowLines) {
    const rowText = normalizeWhitespace(rowLines.join(' '))
    if (!rowText) return null

    const matches = rowText.match(/\b\d{6}\b/g) ?? []
    if (matches.length === 0) return null

    const projectNumber = matches[matches.length - 1]
    const projectIndex = rowText.indexOf(projectNumber)
    const afterProject = projectIndex >= 0 ? rowText.slice(projectIndex + projectNumber.length) : ''

    const description = cleanProjectDescription(afterProject) || `Project ${projectNumber}`
    const typeFromText = parseProjectType(description)

    return {
        project_number: projectNumber,
        project_description: description,
        type: typeFromText ?? inferProjectTypeFromDescription(description),
        sales_price: parseSalesPriceCents(rowText),
        accepted: true
    }
}

function dedupeProjects(rows) {
    const byNumber = new Map()
    for (const row of rows) {
        if (!row?.project_number) continue

        const current = byNumber.get(row.project_number)
        if (!current) {
            byNumber.set(row.project_number, row)
            continue
        }

        const currentLength = current.project_description?.length ?? 0
        const nextLength = row.project_description?.length ?? 0
        if (nextLength > currentLength) {
            byNumber.set(row.project_number, row)
        }
    }

    return Array.from(byNumber.values())
}

function extractProjectsFromDetailLines(detailLines) {
    const projects = []
    let inSection = false
    let rowBuffer = []

    const flushRow = () => {
        if (rowBuffer.length === 0) return
        const parsed = extractProjectFromRow(rowBuffer)
        if (parsed) projects.push(parsed)
        rowBuffer = []
    }

    for (const line of detailLines) {
        const text = normalizeWhitespace(line)
        if (!text || isNoiseLine(text)) continue

        if (/^sales\s+order\s+lines$/i.test(text)) {
            inSection = true
            continue
        }

        if (!inSection) continue

        if (
            /^total\s*\(/i.test(text)
            || /^price\s+and\s+discount$/i.test(text)
            || /^line\s+attributes\s+differing\s+from\s+header$/i.test(text)
        ) {
            flushRow()
            break
        }

        if (/^\d+\.\d{3}\b/.test(text)) {
            flushRow()
            rowBuffer = [text]
            continue
        }

        if (rowBuffer.length > 0) {
            rowBuffer.push(text)
        }
    }

    flushRow()
    return dedupeProjects(projects)
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

    return groups
        .map((group) => group.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(' '))
        .map((line) => normalizeWhitespace(line))
        .filter(Boolean)
}

async function extractPages(buffer) {
    const loadingTask = getDocument({ data: new Uint8Array(buffer) })
    const pdf = await loadingTask.promise
    const pages = []

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

        pages.push({
            pageNumber,
            lines: groupTextItemsIntoLines(items)
        })
    }

    return pages
}

export function buildDraftFromPages(pages) {
    const allLines = pages.flatMap((page) => page.lines)
    const firstPageLines = pages.find((page) => page.pageNumber === 1)?.lines ?? allLines
    const detailLines = pages
        .filter((page) => page.pageNumber >= 2)
        .flatMap((page) => page.lines)

    const firstPageText = normalizeWhitespace(firstPageLines.join(' '))
    const orderNumber = extractByRegex(firstPageText, /\bsales\s*order\s*[:\-]?\s*([A-Za-z]{2}\d{2}-\d{6})\b/i)
        || extractLabel(firstPageLines, [
            /sales\s*order\s*[:\-]?\s*([A-Za-z]{2}\d{2}-\d{6})$/i,
            /order\s*number\s*[:\-]\s*([A-Za-z]{2}\d{2}-\d{6})$/i,
            /order\s*#\s*[:\-]?\s*([A-Za-z]{2}\d{2}-\d{6})$/i
        ])

    const receivedDateText = extractByRegex(firstPageText, /\bcreated\s*date\s*[:\-]?\s*([A-Za-z]{3}\s+\d{1,2},\s+\d{4})\b/i)
        || extractLabel(firstPageLines, [
            /created\s*date\s*[:\-]?\s*([A-Za-z]{3}\s+\d{1,2},\s+\d{4})$/i,
            /received\s*date\s*[:\-]\s*(.+)$/i,
            /order\s*date\s*[:\-]?\s*(.+)$/i
        ])

    const quoteRef = extractByRegex(firstPageText, /\bquote\s*(?:ref|no\.?|number)?\s*[:\-]?\s*([A-Za-z0-9-]{4,})\b/i)
        || extractLabel(firstPageLines, [
            /quote\s*(?:ref|no\.?|number)?\s*[:\-]?\s*(.+)$/i
        ])

    const poRef = extractByRegex(firstPageText, /\bcustomer\s*po\s*[:\-]?\s*([A-Za-z0-9-]{3,})\b/i)
        || extractLabel(firstPageLines, [
            /customer\s*po\s*[:\-]?\s*(.+)$/i,
            /p(?:urchase)?\s*o(?:rder)?\s*(?:ref|no\.?|number)?\s*[:\-]?\s*(.+)$/i
        ])

    const paymentTerms = extractLabel(firstPageLines, [
        /payment\s*terms\s*[:\-]?\s*(.+)$/i,
        /customer\s*terms\s*[:\-]?\s*(.+)$/i
    ])

    const deliveryTerms = extractLabel(firstPageLines, [
        /delivery\s*terms\s*[:\-]?\s*(.+)$/i
    ])

    const projectRows = extractProjectsFromDetailLines(detailLines)

    const errors = []
    const warnings = []

    if (!orderNumber) errors.push('order_number not found in page 1 PDF text')
    if (!receivedDateText) warnings.push('order_received_date not found on page 1; please edit before commit')

    if (pages.length < 2) {
        errors.push('no detail pages found; expected project lines on page 2 and onward')
    }
    else if (projectRows.length === 0) {
        errors.push('no project lines were extracted from detail pages (page 2+)')
    }

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
            template_version: 'pdf_v2_detail_pages',
            confidence: 0.75
        }
    }

    return { draft, warnings, errors, templateVersion: 'pdf_v2_detail_pages', confidence: 0.75 }
}

export function extractProjectsForTest(detailLines) {
    return extractProjectsFromDetailLines(detailLines)
}

export async function parsePdfBuffer(buffer) {
    if (!buffer || buffer.length === 0) {
        throw new Error('empty PDF payload')
    }

    const pages = await extractPages(buffer)
    if (pages.length === 0 || pages.every((page) => page.lines.length === 0)) {
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
                    template_version: 'pdf_v2_detail_pages',
                    confidence: 0
                }
            },
            warnings: [],
            errors: ['unable to extract readable text from PDF'],
            templateVersion: 'pdf_v2_detail_pages',
            confidence: 0
        }
    }

    return buildDraftFromPages(pages)
}
