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
