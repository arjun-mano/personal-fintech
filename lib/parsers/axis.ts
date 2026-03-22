import Papa from 'papaparse'
import { parseAmount, parseDate, toMonth, cleanMerchant } from './utils'
import type { ParsedTransaction } from '@/types'

/**
 * Axis Bank CSV parser.
 * Columns: Tran Date | CHQNO | PARTICULARS | DR | CR | BAL
 */
export function parseAxisCsv(csvText: string): ParsedTransaction[] {
  const lines = csvText.split('\n')
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes('tran date') || lower.includes('particulars') || lower.includes('dr')) {
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
    const dateRaw = row['Tran Date'] || row['Transaction Date'] || row['Date'] || ''
    const description = row['PARTICULARS'] || row['Particulars'] || row['Description'] || row['Narration'] || ''
    const debitRaw = row['DR'] || row['Debit'] || row['Withdrawal'] || ''
    const creditRaw = row['CR'] || row['Credit'] || row['Deposit'] || ''
    const balanceRaw = row['BAL'] || row['Balance'] || ''

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
