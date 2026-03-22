import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectRecurring } from '@/lib/recurring-detector'
import type { Transaction } from '@/types'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch all transactions for this user
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const candidates = detectRecurring((transactions ?? []) as Transaction[])

  // Upsert recurring expenses — match on user_id + merchant_clean
  for (const candidate of candidates) {
    const { data: existing } = await supabase
      .from('recurring_expenses')
      .select('id, is_confirmed, is_dismissed')
      .eq('user_id', user.id)
      .eq('merchant_clean', candidate.merchant_clean)
      .single()

    if (existing) {
      // Update stats but preserve user's confirmed/dismissed status
      await supabase.from('recurring_expenses').update({
        avg_amount: candidate.avg_amount,
        frequency: candidate.frequency,
        last_seen_month: candidate.last_seen_month,
        occurrence_count: candidate.occurrence_count,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('recurring_expenses').insert(candidate)
    }
  }

  return NextResponse.json({ detected: candidates.length })
}
