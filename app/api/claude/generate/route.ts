import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { buildPrompt } from '@/lib/prompt-builder'
import type { Transaction, RecurringExpense, PlannedExpense } from '@/types'

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

  const { month } = await request.json()
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const [txResult, recResult, planResult] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user.id).eq('month', month),
    supabase.from('recurring_expenses').select('*').eq('user_id', user.id).eq('is_dismissed', false),
    supabase.from('planned_expenses').select('*').eq('user_id', user.id).eq('month', month),
  ])

  const transactions = (txResult.data ?? []) as Transaction[]
  const recurring = (recResult.data ?? []) as RecurringExpense[]
  const planned = (planResult.data ?? []) as PlannedExpense[]

  const prompt = buildPrompt({ month, transactions, recurring, planned })

  // Save as a new session
  const { data: session, error } = await supabase
    .from('claude_sessions')
    .insert({ user_id: user.id, month, generated_prompt: prompt, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ session_id: session.id, prompt })
}
