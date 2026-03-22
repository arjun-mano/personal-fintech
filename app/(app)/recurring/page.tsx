'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import type { RecurringExpense } from '@/types'

export default function RecurringPage() {
  const [items, setItems] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('recurring_expenses')
      .select('*')
      .order('avg_amount', { ascending: false })
    setItems((data ?? []) as RecurringExpense[])
    setLoading(false)
  }

  async function handleConfirm(id: string) {
    await supabase.from('recurring_expenses').update({ is_confirmed: true, is_dismissed: false }).eq('id', id)
    setItems((prev) => prev.map((r) => r.id === id ? { ...r, is_confirmed: true, is_dismissed: false } : r))
    toast.success('Marked as confirmed recurring expense')
  }

  async function handleDismiss(id: string) {
    await supabase.from('recurring_expenses').update({ is_dismissed: true, is_confirmed: false }).eq('id', id)
    setItems((prev) => prev.map((r) => r.id === id ? { ...r, is_dismissed: true, is_confirmed: false } : r))
    toast.success('Dismissed')
  }

  const confirmed = items.filter((r) => r.is_confirmed && !r.is_dismissed)
  const pending = items.filter((r) => !r.is_confirmed && !r.is_dismissed)
  const dismissed = items.filter((r) => r.is_dismissed)

  if (loading) return <div className="p-6 text-muted-foreground">Detecting recurring expenses...</div>

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Recurring Expenses</h1>
      <p className="text-muted-foreground mb-6">
        These merchants appear in multiple months. Confirm the ones that are real recurring expenses.
      </p>

      {items.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          No recurring expenses detected yet. Upload at least 2 months of statements.
        </div>
      )}

      {confirmed.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Confirmed ({confirmed.length})</h2>
          <div className="space-y-2">
            {confirmed.map((r) => <RecurringCard key={r.id} item={r} onConfirm={handleConfirm} onDismiss={handleDismiss} />)}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Detected — Needs Review ({pending.length})</h2>
          <div className="space-y-2">
            {pending.map((r) => <RecurringCard key={r.id} item={r} onConfirm={handleConfirm} onDismiss={handleDismiss} />)}
          </div>
        </section>
      )}

      {dismissed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dismissed ({dismissed.length})</h2>
          <div className="space-y-2 opacity-50">
            {dismissed.map((r) => <RecurringCard key={r.id} item={r} onConfirm={handleConfirm} onDismiss={handleDismiss} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function RecurringCard({ item, onConfirm, onDismiss }: {
  item: RecurringExpense
  onConfirm: (id: string) => void
  onDismiss: (id: string) => void
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-3 px-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{item.merchant_clean}</span>
            <Badge variant={item.frequency === 'monthly' ? 'default' : 'secondary'} className="text-xs shrink-0">
              {item.frequency}
            </Badge>
            {item.is_confirmed && <Badge variant="outline" className="text-xs text-green-600 border-green-300 shrink-0">confirmed</Badge>}
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">
            {formatINR(item.avg_amount)}/avg · seen {item.occurrence_count}x
            {item.first_seen_month && ` · since ${item.first_seen_month}`}
          </div>
        </div>
        <div className="flex gap-2 ml-4 shrink-0">
          {!item.is_confirmed && (
            <Button size="sm" variant="outline" onClick={() => onConfirm(item.id)}>Confirm</Button>
          )}
          {!item.is_dismissed && (
            <Button size="sm" variant="ghost" onClick={() => onDismiss(item.id)}>Dismiss</Button>
          )}
          {item.is_dismissed && (
            <Button size="sm" variant="ghost" onClick={() => onConfirm(item.id)}>Restore</Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
