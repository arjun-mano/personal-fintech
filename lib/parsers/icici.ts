import Papa from 'papaparse'
import { parseAmount, parseDate, toMonth, cleanMerchant } from './utils'
import type { ParsedTransaction } from '@/types'

/**
 * ICICI Bank CSV parser (iMobile / Net Banking export).
 * Columns: Transaction Date | Transaction Remarks | Withdrawal Amount (INR) | Deposit Amount (INR) | Balance (INR)
 */
export function parseIciciCsv(csvText: string): ParsedTransaction[] {
  const lines = csvText.split('\n')
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes('transaction date') || lower.includes('remarks') || lower.includes('withdrawal')) {
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
    const dateRaw =
      row['Transaction Date'] ||
      row['Value Date'] ||
      row['Date'] ||
      ''
    const description =
      row['Transaction Remarks'] ||
      row['Remarks'] ||
      row['Description'] ||
      row['Narration'] ||
      ''
    const debitRaw =
      row['Withdrawal Amount (INR )'] ||
      row['Withdrawal Amount (INR)'] ||
      row['Debit'] ||
      row['Withdrawal'] ||
      ''
    const creditRaw =
      row['Deposit Amount (INR )'] ||
      row['Deposit Amount (INR)'] ||
      row['Credit'] ||
      row['Deposit'] ||
      ''
    const balanceRaw = row['Balance (INR )'] || row['Balance (INR)'] || row['Balance'] || ''

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
