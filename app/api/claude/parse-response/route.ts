import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { parseClaudeResponse } from '@/lib/response-parser'

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, cookies: { getAll: () => [], setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session_id, response_text } = await request.json()
  if (!session_id || !response_text) {
    return NextResponse.json({ error: 'session_id and response_text required' }, { status: 400 })
  }

  const parsed = parseClaudeResponse(response_text)

  const { error } = await supabase
    .from('claude_sessions')
    .update({
      pasted_response: response_text,
      parsed_analysis: parsed,
      status: 'responded',
      responded_at: new Date().toISOString(),
    })
    .eq('id', session_id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ analysis: parsed })
}
