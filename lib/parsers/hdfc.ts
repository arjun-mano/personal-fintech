import Papa from 'papaparse'
import { parseAmount, parseDate, toMonth, cleanMerchant } from './utils'
import type { ParsedTransaction } from '@/types'

/**
 * HDFC Bank CSV parser.
 * CSV columns (Net Banking download):
 * Date | Narration | Value Dt | Debit Amount | Credit Amount | Chq/Ref Number | Closing Balance
 */
export function parseHdfcCsv(csvText: string): ParsedTransaction[] {
  // HDFC CSVs often have header rows before the actual table
  // Find the line that contains the column headers
  const lines = csvText.split('\n')
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('narration') || lines[i].toLowerCase().includes('date')) {
      headerIdx = i
      break
    }
  }

  const cleanCsv = headerIdx >= 0 ? lines.slice(headerIdx).join('\n') : csvText

  const result = Papa.parse<Record<string, string>>(cleanCsv, {
    header: true,
    skipEmptyLines: true,
  })

  const transactions: ParsedTransaction[] = []

  for (const row of result.data) {
    // Map various HDFC column name variants
    const dateRaw = row['Date'] || row['date'] || row['Transaction Date'] || ''
    const narration = row['Narration'] || row['narration'] || row['Description'] || row['description'] || ''
    const debitRaw = row['Debit Amount'] || row['Withdrawal Amt.'] || row['Withdrawal Amount'] || row['debit'] || ''
    const creditRaw = row['Credit Amount'] || row['Deposit Amt.'] || row['Deposit Amount'] || row['credit'] || ''
    const balanceRaw = row['Closing Balance'] || row['Balance'] || row['balance'] || ''

    const dateStr = parseDate(dateRaw)
    if (!dateStr || !narration.trim()) continue

    transactions.push({
      date: dateStr,
      description: narration.trim(),
      debit: parseAmount(debitRaw),
      credit: parseAmount(creditRaw),
      balance: parseAmount(balanceRaw),
    })
  }

  return transactions
}

/**
 * HDFC Bank PDF text parser.
 * Extracts transactions from the raw text output of pdf-parse.
 */
export function parseHdfcPdf(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // HDFC PDF pattern: date at start of line
  // e.g.: "15/01/2024  UPI-SWIGGY-9876543210  15/01/2024  450.00  1,23,456.78"
  const lineRegex = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g

  let match
  while ((match = lineRegex.exec(text)) !== null) {
    const [, dateStr, narration, , amountStr, balanceStr] = match
    const date = parseDate(dateStr)
    const amount = parseAmount(amountStr)
    const balance = parseAmount(balanceStr)

    // HDFC PDF doesn't clearly separate debit/credit — use balance delta heuristic
    // If we can't determine, put in debit (common case)
    transactions.push({
      date,
      description: narration.trim(),
      debit: amount,
      credit: null,
      balance,
    })
  }

  return transactions
}

/**
 * HDFC Bank fixed-width TXT parser.
 * Format: multi-page statement with column positions determined by separator line.
 * Separator: "--------  ----...  ----..."
 * Columns: Date | Narration | Chq./Ref.No. | Value Dt | Withdrawal Amt. | Deposit Amt. | Closing Balance
 * Narrations can span multiple continuation lines (leading spaces).
 */
export function parseHdfcTxt(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const lines = text.split('\n')

  // Detect column positions from the first separator line
  // e.g. "--------  ----------------------------------------  ..."
  type Col = { start: number; end: number }
  function parseSepLine(line: string): Col[] {
    const cols: Col[] = []
    let inDash = false
    let start = 0
    for (let i = 0; i <= line.length; i++) {
      const c = i < line.length ? line[i] : ' '
      if (!inDash && c === '-') { inDash = true; start = i }
      else if (inDash && c !== '-') { cols.push({ start, end: i }); inDash = false }
    }
    return cols
  }

  let cols: Col[] = []
  for (const line of lines) {
    if (/^-{4,}\s+-{4,}/.test(line)) {
      cols = parseSepLine(line)
      break
    }
  }
  if (cols.length < 7) return []

  // col indices: 0=date, 1=narration, 2=ref, 3=valuedt, 4=withdrawal, 5=deposit, 6=balance
  const [datCol, narCol, , , wdrCol, depCol, balCol] = cols

  function col(line: string, c: Col, toEnd = false): string {
    if (line.length <= c.start) return ''
    return toEnd
      ? line.substring(c.start).trim()
      : line.substring(c.start, c.end).trim()
  }

  // State machine: skip page header sections, process data lines
  // Page structure: metadata → sep1 → header-row → sep2 → data → **Continue**
  let state: 'header' | 'data' = 'header'
  let sepsSeen = 0

  interface TxBuf { date: string; narration: string; withdrawal: string; deposit: string; balance: string }
  let buf: TxBuf | null = null

  function flush() {
    if (!buf) return
    const dateStr = parseDate(buf.date)
    if (dateStr && buf.narration) {
      transactions.push({
        date: dateStr,
        description: buf.narration,
        debit: parseAmount(buf.withdrawal),
        credit: parseAmount(buf.deposit),
        balance: parseAmount(buf.balance),
      })
    }
    buf = null
  }

  for (const line of lines) {
    // Page-break marker → re-enter header mode
    if (/\*\*Continue\*\*/i.test(line)) {
      flush()
      state = 'header'
      sepsSeen = 0
      continue
    }

    // Separator line
    if (/^-{4,}/.test(line.trim())) {
      sepsSeen++
      // After the 2nd separator per page, data begins
      if (sepsSeen % 2 === 0) state = 'data'
      continue
    }

    if (state !== 'data') continue
    if (!line.trim()) continue

    const dateCell = col(line, datCol)

    if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(dateCell)) {
      // New transaction line
      flush()
      buf = {
        date: dateCell,
        narration: col(line, narCol),
        withdrawal: col(line, wdrCol),
        deposit: col(line, depCol),
        balance: col(line, balCol, true),
      }
    } else if (buf && dateCell === '') {
      // Continuation line — append narration fragment
      const extra = col(line, narCol)
      if (extra) buf.narration = (buf.narration + ' ' + extra).trim()
    }
  }
  flush()

  return transactions
}

export function enrichWithMeta(
  transactions: ParsedTransaction[],
  statementId: string,
  userId: string
) {
  return transactions.map((t) => ({
    ...t,
    statement_id: statementId,
    user_id: userId,
    month: toMonth(t.date),
    merchant_clean: cleanMerchant(t.description),
    category: 'other' as const,
    is_recurring: false,
  }))
}
