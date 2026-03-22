'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Bank } from '@/types'

const BANKS: { value: Bank; label: string }[] = [
  { value: 'HDFC', label: 'HDFC Bank' },
  { value: 'SBI', label: 'State Bank of India' },
  { value: 'ICICI', label: 'ICICI Bank' },
  { value: 'AXIS', label: 'Axis Bank' },
  { value: 'KOTAK', label: 'Kotak Mahindra Bank' },
]

export default function UploadPage() {
  const [bank, setBank] = useState<Bank | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [pdfPassword, setPdfPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ count: number; month: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  async function handleUpload() {
    if (!file || !bank) {
      toast.error('Please select a bank and file')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bank', bank)
      if (pdfPassword) formData.append('pdf_password', pdfPassword)

      const res = await fetch('/api/statements/parse', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Upload failed')
        return
      }

      setResult({ count: data.transaction_count, month: data.detected_month })
      toast.success(`Parsed ${data.transaction_count} transactions from ${data.detected_month}`)

      // Trigger recurring detection in background
      fetch('/api/recurring/detect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Upload Bank Statement</h1>
      <p className="text-muted-foreground mb-6">
        Download from your bank&apos;s Net Banking portal. CSV or XLS gives best accuracy.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Statement Details</CardTitle>
          <CardDescription>Select your bank and the month this statement covers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Bank</label>
            <Select value={bank} onValueChange={(v) => setBank(v as Bank)}>
              <SelectTrigger>
                <SelectValue placeholder="Select bank..." />
              </SelectTrigger>
              <SelectContent>
                {BANKS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">The statement month will be detected automatically from the transactions.</p>
          </div>

          {/* Dropzone */}
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.pdf,.txt,.xls,.xlsx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <Badge variant="secondary" className="mt-2">
                  {file.name.toLowerCase().split('.').pop()?.toUpperCase() ?? 'FILE'}
                </Badge>
              </div>
            ) : (
              <div>
                <p className="text-3xl mb-2">📂</p>
                <p className="font-medium">Drop file here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">Supports CSV, PDF, TXT, XLS, XLSX</p>
              </div>
            )}
          </div>

          {/* PDF password — only shown when a PDF is selected */}
          {file?.name.toLowerCase().endsWith('.pdf') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">PDF Password <span className="text-muted-foreground font-normal">(if protected)</span></label>
              <input
                type="password"
                value={pdfPassword}
                onChange={(e) => setPdfPassword(e.target.value)}
                placeholder="Leave blank if not password protected"
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
          )}

          <Button onClick={handleUpload} disabled={loading || !file || !bank} className="w-full">
            {loading ? 'Parsing...' : 'Upload & Parse'}
          </Button>

          {result && (
            <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              ✅ Imported <strong>{result.count}</strong> transactions from <strong>{result.month}</strong>.
              <a href="/transactions" className="ml-2 underline">View transactions →</a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
