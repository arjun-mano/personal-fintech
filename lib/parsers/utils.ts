/**
 * Normalize an Indian-formatted amount string to a number.
 * Handles: "1,23,456.78", "1,23,456", "1234.56", "-1,234.00"
 */
export function parseAmount(raw: string | undefined | null): number | null {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null
  const cleaned = raw.replace(/,/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

/**
 * Normalize a date string to YYYY-MM-DD.
 * Accepts: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, YYYY-MM-DD, D Mon YYYY, DD Mon YYYY
 */
export function parseDate(raw: string): string {
  if (!raw) return ''
  raw = raw.trim()

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // DD Mon YYYY  (e.g. "15 Jan 2024" or "15-Jan-2024")
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }
  const dMonY = raw.match(/^(\d{1,2})[\s\-]([A-Za-z]{3})[\s\-](\d{4})$/)
  if (dMonY) {
    const [, d, mon, y] = dMonY
    const m = months[mon.toLowerCase()] ?? '01'
    return `${y}-${m}-${d.padStart(2, '0')}`
  }

  return raw
}

/**
 * Extract YYYY-MM from a date string.
 */
export function toMonth(dateStr: string): string {
  const d = parseDate(dateStr)
  return d.slice(0, 7)
}

/**
 * Strip UPI ref numbers, UTR numbers, NEFT refs, and other noise from descriptions.
 * Returns a cleaned merchant name.
 */
export function cleanMerchant(description: string): string {
  let s = description

  // Remove UPI transaction IDs (long digit strings)
  s = s.replace(/\b\d{10,}\b/g, '')
  // Remove UTR/Ref patterns
  s = s.replace(/(?:UTR|REF|NEFT|IMPS|UPI)[\/\s:]*\w+/gi, '')
  // Remove mobile numbers
  s = s.replace(/\b[6-9]\d{9}\b/g, '')
  // Remove common bank noise prefixes
  s = s.replace(/^(UPI[-\/]|NEFT[-\/]|IMPS[-\/]|ACH[-\/]|SI[-\/]|EMI[-\/]|BIL[-\/]BILLPAY[-\/]|BILLPAY[-\/])/i, '')
  // Remove trailing/leading slashes, dashes, spaces
  s = s.replace(/[-\/]+$/, '').replace(/^[-\/]+/, '').trim()
  // Collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim()

  return s || description.trim()
}
