import type { Transaction, RecurringExpense, PlannedExpense } from '@/types'
import { CATEGORY_LABELS } from './categorizer'
import { formatMonth } from './utils'

function formatINRPlain(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

export function buildPrompt(params: {
  month: string
  transactions: Transaction[]
  recurring: RecurringExpense[]
  planned: PlannedExpense[]
}): string {
  const { month, transactions, recurring, planned } = params

  const debits = transactions.filter((t) => t.debit && t.debit > 0)
  const credits = transactions.filter((t) => t.credit && t.credit > 0)

  const totalDebit = debits.reduce((s, t) => s + (t.debit ?? 0), 0)
  const totalCredit = credits.reduce((s, t) => s + (t.credit ?? 0), 0)
  const netSavings = totalCredit - totalDebit
  const savingsRate = totalCredit > 0 ? ((netSavings / totalCredit) * 100).toFixed(1) : '0'

  // Category breakdown (exclude salary, transfers, ATM from spending)
  const spendingCategories = ['food_delivery', 'groceries', 'fuel', 'transport', 'utilities', 'emi_loan', 'rent', 'entertainment', 'shopping', 'medical', 'other']
  const catMap = new Map<string, number>()
  for (const t of debits) {
    if (!spendingCategories.includes(t.category)) continue
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + (t.debit ?? 0))
  }
  const catRows = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const pct = totalDebit > 0 ? ((amt / totalDebit) * 100).toFixed(1) : '0'
      const label = CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat
      return `| ${label.padEnd(20)} | ₹${formatINRPlain(amt).padStart(10)} | ${pct}% |`
    })
    .join('\n')

  // Top merchants
  const merchantMap = new Map<string, { amount: number; count: number }>()
  for (const t of debits) {
    const key = t.merchant_clean || t.description
    const prev = merchantMap.get(key) ?? { amount: 0, count: 0 }
    merchantMap.set(key, { amount: prev.amount + (t.debit ?? 0), count: prev.count + 1 })
  }
  const topMerchants = Array.from(merchantMap.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 8)
    .map(([name, { amount, count }], i) =>
      `${i + 1}. ${name} — ₹${formatINRPlain(amount)} (${count} transaction${count > 1 ? 's' : ''})`
    )
    .join('\n')

  // Confirmed recurring
  const confirmedRecurring = recurring
    .filter((r) => r.is_confirmed && !r.is_dismissed)
    .map((r) => `- ${r.merchant_clean}: ₹${formatINRPlain(r.avg_amount ?? 0)}/month`)
    .join('\n') || '(none confirmed yet)'

  // Planned expenses for next month
  const nextMonthDate = new Date(month.split('-')[0] + '-' + month.split('-')[1] + '-01')
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1)
  const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`

  const plannedRows = planned.length > 0
    ? planned.map((p) => `- ${p.label}: ₹${formatINRPlain(p.amount)}`).join('\n')
    : '(no upcoming expenses entered yet)'
  const totalPlanned = planned.reduce((s, p) => s + p.amount, 0)

  // Notable transactions (top 5 largest single debits)
  const notable = debits
    .sort((a, b) => (b.debit ?? 0) - (a.debit ?? 0))
    .slice(0, 5)
    .map((t) => `- ${t.date}: ${t.merchant_clean || t.description} — ₹${formatINRPlain(t.debit ?? 0)}`)
    .join('\n')

  return `You are a personal finance advisor. Analyze the following transaction data for ${formatMonth(month)} and provide specific, actionable advice.

---

## MONTHLY SUMMARY

Income / Credits: ₹${formatINRPlain(totalCredit)}
Total Spending: ₹${formatINRPlain(totalDebit)}
Net Savings: ₹${formatINRPlain(netSavings)}
Savings Rate: ${savingsRate}%
Total Transactions: ${transactions.length}

---

## SPENDING BY CATEGORY

| Category             |     Amount (₹) | % of Spending |
|----------------------|----------------|---------------|
${catRows}

---

## TOP MERCHANTS (by spend)

${topMerchants}

---

## RECURRING EXPENSES (confirmed)

${confirmedRecurring}

---

## UPCOMING PLANNED EXPENSES (Next Month: ${formatMonth(nextMonthStr)})

${plannedRows}
${planned.length > 0 ? `\nTotal planned: ₹${formatINRPlain(totalPlanned)}` : ''}

---

## NOTABLE TRANSACTIONS (largest single debits)

${notable}

---

## MY QUESTIONS FOR YOU

1. How can I realistically reduce my top 2 spending categories?
2. Given my recurring EMIs/commitments, what savings target is achievable next month?
3. Are there any subscriptions or recurring charges I should reconsider?
4. Based on my planned expenses (₹${formatINRPlain(totalPlanned)}), what's my discretionary spending budget for next month?
5. What is the single biggest change I can make to improve my finances?

---

Please provide your response with EXACTLY these section headers (copy them as-is):

**A) SAVINGS SCORE**
Give a score from 1-10 with a 2-3 sentence explanation.

**B) TOP 3 SUGGESTIONS**
List exactly 3 suggestions. For each: title, 1-2 sentence description, estimated monthly savings in ₹.

**C) CATEGORY BUDGETS FOR NEXT MONTH**
For each spending category above, give a recommended budget. Format as a table: Category | Actual This Month | Recommended Next Month.

**D) RED FLAGS**
List any concerning patterns (overspending, unusual transactions, etc.). If none, say "No red flags."

**E) OVERALL SUMMARY**
One paragraph (3-5 sentences) overall financial health assessment.`
}
