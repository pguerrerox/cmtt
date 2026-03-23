function normalizeCell(value) {
  return String(value ?? '').trim()
}

export function parseBooleanFlag(value, fallback = 1) {
  const text = normalizeCell(value).toLowerCase()
  if (!text) return fallback
  if (['1', 'true', 'yes', 'y'].includes(text)) return 1
  if (['0', 'false', 'no', 'n'].includes(text)) return 0
  return fallback
}

export function parseCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      const next = line[index + 1]
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(normalizeCell(current))
      current = ''
      continue
    }

    current += char
  }

  values.push(normalizeCell(current))
  return values
}

export function parseCsvRows(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({ rowNumber: index + 1, values: parseCsvLine(line) }))
}
