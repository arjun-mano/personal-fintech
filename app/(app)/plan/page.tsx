'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatINR, formatMonth, nextMonth } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { CATEGORY_LABELS } from '@/lib/categorizer'
import type { PlannedExpense, RecurringExpense, Category } from '@/types'

export default function PlanPage() {
  const month = nextMonth()
  const [planned, setPlanned] = useState<PlannedExpense[]>([])
  const [recurring, setRecurring] = useState<RecurringExpense[]>([])
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('other')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const [p, r] = await Promise.all([
        supabase.from('planned_expenses').select('*').eq('month', month).order('created_at'),
        supabase.from('recurring_expenses').select('*').eq('is_confirmed', true).eq('is_dismissed', false).order('avg_amount', { ascending: false }),
      ])
      setPlanned((p.data ?? []) as PlannedExpense[])
      setRecurring((r.data ?? []) as RecurringExpense[])
    }
    load()
  }, [])

  async function addExpense() {
    if (!label.trim() || !amount) {
      toast.error('Enter a label and amount')
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('planned_expenses')
      .insert({ month, label: label.trim(), amount: parseFloat(amount), category })
      .select()
      .single()
    setLoading(false)

    if (error) { toast.error(error.message); return }
    setPlanned((prev) => [...prev, data as PlannedExpense])
    setLabel(''); setAmount(''); setCategory('other')
    toast.success('Added')
  }

  async function addFromRecurring(r: RecurringExpense) {
    if (planned.some((p) => p.label === r.merchant_clean)) {
      toast.info('Already added')
      return
    }
    const { data, error } = await supabase
      .from('planned_expenses')
      .insert({ month, label: r.merchant_clean, amount: r.avg_amount, category: 'other', recurring_ref_id: r.id })
      .select()
      .single()
    if (!error && data) {
      setPlanned((prev) => [...prev, data as PlannedExpense])
      toast.success(`Added ${r.merchant_clean}`)
    }
  }

  async function deleteExpense(id: string) {
    await supabase.from('planned_expenses').delete().eq('id', id)
    setPlanned((prev) => prev.filter((p) => p.id !== id))
  }

  const total = planned.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Plan Next Month</h1>
      <p className="text-muted-foreground mb-6">
        Add your expected expenses for <strong>{formatMonth(month)}</strong>. This feeds into your AI analysis.
      </p>

      {/* Quick add from recurring */}
      {recurring.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Quick Add from Recurring</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {recurring.map((r) => {
              const already = planned.some((p) => p.label === r.merchant_clean)
              return (
                <button
                  key={r.id}
                  onClick={() => addFromRecurring(r)}
                  disabled={already}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    already
                      ? 'bg-muted text-muted-foreground cursor-default'
                      : 'hover:bg-primary hover:text-primary-foreground border-border'
                  }`}
                >
                  {r.merchant_clean} · {formatINR(r.avg_amount)}
                  {already && ' ✓'}
                </button>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Manual add form */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Label (e.g. Rent, Car EMI)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="flex-1 min-w-40"
            />
            <Input
              type="number"
              placeholder="Amount ₹"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-36"
            />
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([val, lbl]) => (
                  <SelectItem key={val} value={val}>{lbl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addExpense} disabled={loading}>Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Planned list */}
      {planned.length === 0 ? (
        <div className="text-muted-foreground text-center py-8">No expenses planned yet.</div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {planned.map((p) => (
              <div key={p.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <span className="font-medium">{p.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{CATEGORY_LABELS[p.category as Category] ?? p.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatINR(p.amount)}</span>
                  <button onClick={() => deleteExpense(p.id)} className="text-muted-foreground hover:text-destructive text-lg leading-none">×</button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-lg font-semibold mb-6">
            <span>Total Planned</span>
            <span>{formatINR(total)}</span>
          </div>
          <Button className="w-full" onClick={() => router.push('/claude')}>
            Generate AI Analysis →
          </Button>
        </>
      )}
    </div>
  )
}
