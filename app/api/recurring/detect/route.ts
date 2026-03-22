import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { detectRecurring } from '@/lib/recurring-detector'
import type { Transaction } from '@/types'

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const authClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { data: { user } } = await authClient.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

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
