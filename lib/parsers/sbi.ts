import Papa from 'papaparse'
import { parseAmount, parseDate, toMonth, cleanMerchant } from './utils'
import type { ParsedTransaction } from '@/types'

/**
 * SBI Bank CSV parser (YONO / Net Banking export).
 * Columns: Txn Date | Value Date | Description | Ref No./Cheque No. | Debit | Credit | Balance
 */
export function parseSbiCsv(csvText: string): ParsedTransaction[] {
  const lines = csvText.split('\n')
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes('txn date') || lower.includes('description') || lower.includes('debit')) {
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
    const dateRaw = row['Txn Date'] || row['Transaction Date'] || row['Date'] || ''
    const description = row['Description'] || row['Particulars'] || row['Narration'] || ''
    const debitRaw = row['Debit'] || row['Withdrawal'] || ''
    const creditRaw = row['Credit'] || row['Deposit'] || ''
    const balanceRaw = row['Balance'] || ''

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
