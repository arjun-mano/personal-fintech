import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseStatement } from '@/lib/parsers'
import { categorize } from '@/lib/categorizer'
import type { Bank } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bank = formData.get('bank') as Bank | null
    const pdfPassword = (formData.get('pdf_password') as string | null) ?? ''

    if (!file || !bank) {
      return NextResponse.json({ error: 'Missing file or bank' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const ext = fileName.split('.').pop() ?? ''
    const fileType = ext === 'pdf' ? 'pdf' : (ext === 'xls' || ext === 'xlsx') ? 'xls' : 'csv'
    const fileBuffer = await file.arrayBuffer()
    const fileBytes = new Uint8Array(fileBuffer)

    if (!['pdf', 'csv', 'xls', 'txt'].includes(fileType) && ext !== 'xlsx') {
      return NextResponse.json({ error: 'Unsupported file type. Upload CSV, PDF, TXT, XLS or XLSX.' }, { status: 400 })
    }

    // ── Step 1: Parse file content ────────────────────────────────
    let textContent: string
    if (ext === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buffer: Buffer, options?: Record<string, unknown>) => Promise<{ text: string }>
      try {
        const pdfOptions = pdfPassword ? { password: pdfPassword } : {}
        const pdfData = await pdfParse(Buffer.from(fileBuffer), pdfOptions)
        textContent = pdfData.text
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : ''
        const isPasswordError = msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypted')
        return NextResponse.json(
          { error: isPasswordError
              ? 'PDF is password protected. Enter the password and try again.'
              : 'PDF parse failed. Try downloading as CSV instead.' },
          { status: 422 }
        )
      }
    } else if (ext === 'xls' || ext === 'xlsx') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const XLSX = require('xlsx') as typeof import('xlsx')
      const workbook = XLSX.read(Buffer.from(fileBuffer), { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      textContent = XLSX.utils.sheet_to_csv(sheet)
    } else {
      // csv or txt — both are plain text
      textContent = new TextDecoder('utf-8').decode(fileBytes)
    }

    // ── Step 2: Parse transactions (uses a placeholder statement ID for now) ──
    const parserFileType = ext === 'pdf' ? 'pdf' : ext === 'txt' ? 'txt' : 'csv'
    const enriched = parseStatement(textContent, bank, parserFileType, 'temp', user.id)

    if (enriched.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found. Check that the file format matches the selected bank.' },
        { status: 422 }
      )
    }

    // ── Step 3: Auto-detect month (most frequent YYYY-MM in transaction dates) ──
    const monthCounts = new Map<string, number>()
    for (const t of enriched) {
      monthCounts.set(t.month, (monthCounts.get(t.month) ?? 0) + 1)
    }
    const detectedMonth = [...monthCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]

    // ── Step 4: Upload file to Supabase Storage (path uses detected month) ──
    const filePath = `${user.id}/${detectedMonth}/${fileName}`
    const { error: uploadError } = await supabase.storage
      .from('statements')
      .upload(filePath, fileBytes, { contentType: file.type, upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // ── Step 5: Create statement record with detected month ───────
    const { data: statement, error: stmtError } = await supabase
      .from('statements')
      .insert({
        user_id: user.id,
        file_name: fileName,
        file_path: filePath,
        bank,
        month: detectedMonth,
        parse_status: 'pending',
      })
      .select()
      .single()

    if (stmtError || !statement) {
      return NextResponse.json({ error: 'Failed to create statement record' }, { status: 500 })
    }

    // ── Step 6: Categorize and re-attach real statement ID ────────
    const withCategories = enriched.map((t) => ({
      ...t,
      statement_id: statement.id,
      category: categorize(t.merchant_clean ?? '', t.description),
    }))

    // ── Step 7: Bulk insert transactions ──────────────────────────
    const { error: insertError } = await supabase.from('transactions').insert(withCategories)

    if (insertError) {
      await supabase.from('statements').update({
        parse_status: 'error',
        parse_error: insertError.message,
      }).eq('id', statement.id)
      return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 })
    }

    // ── Step 8: Mark done ─────────────────────────────────────────
    await supabase.from('statements').update({
      parse_status: 'done',
      tx_count: withCategories.length,
      raw_text: textContent.slice(0, 5000),
    }).eq('id', statement.id)

    return NextResponse.json({
      success: true,
      statement_id: statement.id,
      detected_month: detectedMonth,
      transaction_count: withCategories.length,
    })
  } catch (err) {
    console.error('Parse error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
