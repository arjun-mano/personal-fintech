'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatINR, formatMonth, currentMonth } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ParsedAnalysis } from '@/types'

type Step = 1 | 2 | 3

export default function ClaudePage() {
  const [month, setMonth] = useState(currentMonth())
  const [step, setStep] = useState<Step>(1)
  const [prompt, setPrompt] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [response, setResponse] = useState('')
  const [analysis, setAnalysis] = useState<ParsedAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  async function generatePrompt() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/claude/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ month }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { toast.error(data.error); return }
    setPrompt(data.prompt)
    setSessionId(data.session_id)
    setStep(2)
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
    toast.success('Prompt copied! Paste it in Claude.ai')
  }

  async function parseResponse() {
    if (!response.trim()) { toast.error('Paste Claude\'s response first'); return }
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/claude/parse-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ session_id: sessionId, response_text: response }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { toast.error(data.error); return }
    setAnalysis(data.analysis)
    setStep(3)
  }

  const scoreColor = analysis
    ? analysis.savings_score >= 7 ? 'text-green-600' : analysis.savings_score >= 4 ? 'text-yellow-600' : 'text-red-600'
    : ''

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">AI Analysis</h1>
      <p className="text-muted-foreground mb-6">
        Generate a prompt, copy it to Claude.ai, then paste the response back here.
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {(['Generate Prompt', 'Paste Response', 'View Analysis'] as const).map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
              step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>{step > i + 1 ? '✓' : i + 1}</div>
            <span className={`text-sm ${step === i + 1 ? 'font-medium' : 'text-muted-foreground'}`}>{label}</span>
            {i < 2 && <span className="text-muted-foreground">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Generate */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Step 1 — Generate Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium shrink-0">Analysis Month:</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <Button onClick={generatePrompt} disabled={loading || step > 1}>
            {loading && step === 1 ? 'Generating...' : 'Generate My Financial Prompt'}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Copy prompt + paste response */}
      {step >= 2 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Step 2 — Copy to Claude.ai &amp; Paste Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prompt box */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your prompt for {formatMonth(month)}:</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyPrompt}>
                    {copied ? '✅ Copied!' : '📋 Copy Prompt'}
                  </Button>
                  <a
                    href="https://claude.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
                  >
                    Open Claude.ai →
                  </a>
                </div>
              </div>
              <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto max-h-64 whitespace-pre-wrap">{prompt}</pre>
            </div>

            {/* Response paste */}
            <div>
              <label className="text-sm font-medium block mb-2">Paste Claude&apos;s full response here:</label>
              <Textarea
                placeholder="Paste the entire response from Claude here..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="min-h-48 font-mono text-sm"
              />
            </div>
            <Button onClick={parseResponse} disabled={loading || !response.trim()}>
              {loading && step === 2 ? 'Analyzing...' : 'Parse & Analyze Response'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Analysis display */}
      {step >= 3 && analysis && (
        <div className="space-y-4">
          {/* Savings score */}
          <Card className="border-2" style={{ borderColor: analysis.savings_score >= 7 ? '#22c55e' : analysis.savings_score >= 4 ? '#eab308' : '#ef4444' }}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <div className={`text-5xl font-black ${scoreColor}`}>{analysis.savings_score}<span className="text-2xl font-normal text-muted-foreground">/10</span></div>
                <div>
                  <div className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Savings Score</div>
                  <p className="text-sm mt-1">{analysis.savings_score_explanation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Top Suggestions</h3>
              <div className="space-y-3">
                {analysis.suggestions.map((s, i) => (
                  <Card key={i} className="border-green-200 bg-green-50">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium">{s.title}</div>
                          <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                        </div>
                        {s.estimated_saving && (
                          <Badge className="bg-green-600 shrink-0">Save {s.estimated_saving}/mo</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Category budgets */}
          {analysis.category_budgets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommended Budgets for Next Month</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium text-right">This Month</th>
                      <th className="pb-2 font-medium text-right">Recommended</th>
                      <th className="pb-2 font-medium text-right">Saving</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analysis.category_budgets.map((b, i) => {
                      const saving = b.actual - b.recommended
                      return (
                        <tr key={i}>
                          <td className="py-2">{b.category}</td>
                          <td className="py-2 text-right">{formatINR(b.actual)}</td>
                          <td className="py-2 text-right">{formatINR(b.recommended)}</td>
                          <td className={`py-2 text-right font-medium ${saving > 0 ? 'text-green-600' : ''}`}>
                            {saving > 0 ? `+${formatINR(saving)}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Red flags */}
          {analysis.red_flags.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-base text-orange-800">⚠ Red Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {analysis.red_flags.map((f, i) => (
                    <li key={i} className="text-orange-900">• {f}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {analysis.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Overall Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{analysis.summary}</p>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={() => { setStep(1); setPrompt(''); setResponse(''); setAnalysis(null) }}>
            Start New Analysis
          </Button>
        </div>
      )}
    </div>
  )
}
