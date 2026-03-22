import Papa from 'papaparse'
import { parseAmount, parseDate, toMonth, cleanMerchant } from './utils'
import type { ParsedTransaction } from '@/types'

/**
 * Kotak Bank CSV parser.
 * Columns vary — common: Transaction Date | Description | Debit | Credit | Balance
 */
export function parseKotakCsv(csvText: string): ParsedTransaction[] {
  const lines = csvText.split('\n')
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes('transaction date') || lower.includes('description') || lower.includes('debit')) {
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
    const dateRaw = row['Transaction Date'] || row['Date'] || row['Value Date'] || ''
    const description = row['Description'] || row['Narration'] || row['Particulars'] || ''
    const debitRaw = row['Debit'] || row['Withdrawal'] || row['DR Amount'] || ''
    const creditRaw = row['Credit'] || row['Deposit'] || row['CR Amount'] || ''
    const balanceRaw = row['Balance'] || row['Closing Balance'] || ''

    const dateStr = parseDate(dateRaw)
    if (!dateStr || !description.trim()) continue

    transactions.push({
      date: dateStr,
      description: description.trim(),
      debit: parseAmount(debitRaw),
      credit: parseAmount(creditRaw),
      balance: parseAmount(balanceRaw),
    })
  }

  return transactions
}

/**
 * Kotak PDF text parser.
 */
export function parseKotakPdf(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Kotak PDF pattern: DD-Mon-YYYY at start
  const lineRegex = /(\d{2}-[A-Za-z]{3}-\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s+(Cr|Dr)?\s*([\d,]+\.\d{2})/g

  let match
  while ((match = lineRegex.exec(text)) !== null) {
    const [, dateStr, narration, amountStr, crDr, balanceStr] = match
    const date = parseDate(dateStr)
    const amount = parseAmount(amountStr)
    const balance = parseAmount(balanceStr)
    const isCr = crDr?.toLowerCase() === 'cr'

    transactions.push({
      date,
      description: narration.trim(),
      debit: isCr ? null : amount,
      credit: isCr ? amount : null,
      balance,
    })
  }

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
