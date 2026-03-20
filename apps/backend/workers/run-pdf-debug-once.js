import fs from 'fs'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { parsePdfBuffer } from '../services/pdf-scanner/pdf-parser.js'

const filePath = '../_ref-external-data/_OR Iberplast CA01-433007 PN 927344.pdf'

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
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

async function extractRawPages(buffer) {
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

    const lines = groupTextItemsIntoLines(items)
    pages.push({ pageNumber, lines })
  }

  return { pageCount: pdf.numPages, pages }
}

async function run() {
  const buffer = fs.readFileSync(filePath)
  const raw = await extractRawPages(buffer)
  const parsed = await parsePdfBuffer(buffer)
  const fullText = normalizeWhitespace(raw.pages.flatMap((page) => page.lines).join(' '))

  console.log(JSON.stringify({
    filePath,
    pageCount: raw.pageCount,
    pages: raw.pages,
    fullText,
    parsed
  }, null, 2))
}

run().catch((error) => {
  console.error(JSON.stringify({
    message: 'pdf debug extract failed',
    filePath,
    error: error.message
  }))
  process.exitCode = 1
})
