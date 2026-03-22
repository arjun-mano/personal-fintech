import type { Transaction, RecurringExpense } from '@/types'

interface RecurringCandidate {
  merchant_clean: string
  months: string[]
  amounts: number[]
}

/**
 * Detect recurring expenses from a list of transactions.
 * A merchant is considered recurring if it appears in 2+ distinct months.
 */
export function detectRecurring(transactions: Transaction[]): Omit<RecurringExpense, 'id' | 'created_at' | 'updated_at'>[] {
  const map = new Map<string, RecurringCandidate>()

  for (const t of transactions) {
    if (!t.merchant_clean || !t.debit) continue
    // Skip transfers, salary, ATM — they're not "subscriptions"
    if (['transfer', 'salary', 'atm'].includes(t.category)) continue

    const key = t.merchant_clean.toLowerCase()
    if (!map.has(key)) {
      map.set(key, { merchant_clean: t.merchant_clean, months: [], amounts: [] })
    }
    const entry = map.get(key)!
    if (!entry.months.includes(t.month)) {
      entry.months.push(t.month)
    }
    entry.amounts.push(t.debit)
  }

  const results: Omit<RecurringExpense, 'id' | 'created_at' | 'updated_at'>[] = []

  for (const candidate of map.values()) {
    if (candidate.months.length < 2) continue

    const sortedMonths = candidate.months.sort()
    const avgAmount = candidate.amounts.reduce((a, b) => a + b, 0) / candidate.amounts.length

    // Determine frequency
    let frequency: 'monthly' | 'weekly' | 'irregular' = 'monthly'
    if (candidate.months.length >= 2) {
      // Check if monthly by comparing consecutive months
      const isMonthly = sortedMonths.every((m, i) => {
        if (i === 0) return true
        const prev = sortedMonths[i - 1]
        const [py, pm] = prev.split('-').map(Number)
        const [cy, cm] = m.split('-').map(Number)
        const diff = (cy - py) * 12 + (cm - pm)
        return diff === 1
      })
      frequency = isMonthly ? 'monthly' : 'irregular'
    }

    results.push({
      user_id: transactions[0]?.user_id ?? '',
      merchant_clean: candidate.merchant_clean,
      avg_amount: Math.round(avgAmount * 100) / 100,
      frequency,
      first_seen_month: sortedMonths[0],
      last_seen_month: sortedMonths[sortedMonths.length - 1],
      occurrence_count: candidate.months.length,
      is_confirmed: false,
      is_dismissed: false,
    })
  }

  return results.sort((a, b) => (b.avg_amount ?? 0) - (a.avg_amount ?? 0))
}
