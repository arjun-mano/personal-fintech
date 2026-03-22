'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatMonth, currentMonth, prevMonths } from '@/lib/utils'
import { CATEGORY_LABELS } from '@/lib/categorizer'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid
} from 'recharts'
import type { Transaction, ClaudeSession } from '@/types'

function formatINRShort(n: number): string {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}
function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])
  return value
}

const PIE_COLORS = ['#4318FF', '#39B8FF', '#01B574', '#FFB547', '#E31A1A', '#868CFF']

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,14,50,0.95)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: '12px',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 6, letterSpacing: '0.04em', fontSize: '11px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.name === 'income' ? '#01B574' : '#FFB547', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ textTransform: 'capitalize', color: 'rgba(255,255,255,0.6)' }}>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{formatINRShort(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [trendData, setTrendData] = useState<Array<{ month: string; spent: number; income: number }>>([])
  const [latestAnalysis, setLatestAnalysis] = useState<ClaudeSession | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const months = prevMonths(6)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [txResult, trendResult, analysisResult] = await Promise.all([
        supabase.from('transactions').select('*').eq('month', month),
        supabase.from('transactions').select('month, debit, credit').in('month', months),
        supabase.from('claude_sessions').select('*').eq('month', month).eq('status', 'responded').order('created_at', { ascending: false }).limit(1),
      ])
      setTransactions((txResult.data ?? []) as Transaction[])
      const trendMap = new Map<string, { spent: number; income: number }>()
      for (const m of months) trendMap.set(m, { spent: 0, income: 0 })
      for (const t of (trendResult.data ?? []) as Transaction[]) {
        const entry = trendMap.get(t.month)
        if (!entry) continue
        if (t.debit) entry.spent += t.debit
        if (t.credit) entry.income += t.credit
      }
      setTrendData([...trendMap.entries()].reverse().map(([m, v]) => ({
        month: formatMonth(m).split(' ')[0].slice(0, 3),
        spent: Math.round(v.spent),
        income: Math.round(v.income),
      })))
      setLatestAnalysis((analysisResult.data?.[0] ?? null) as ClaudeSession | null)
      setLoading(false)
    }
    load()
  }, [month])

  const totalDebit = transactions.filter(t => !['salary', 'transfer'].includes(t.category)).reduce((s, t) => s + (t.debit ?? 0), 0)
  const totalCredit = transactions.reduce((s, t) => s + (t.credit ?? 0), 0)
  const netSavings = totalCredit - totalDebit
  const savingsRate = totalCredit > 0 ? Math.round((netSavings / totalCredit) * 100) : 0

  const catMap = new Map<string, number>()
  for (const t of transactions) {
    if (!t.debit || ['salary', 'transfer', 'atm'].includes(t.category)) continue
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.debit)
  }
  const pieData = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat, value]) => ({
    name: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat,
    value: Math.round(value),
  }))

  const incomeCount = useCountUp(totalCredit)
  const spentCount = useCountUp(totalDebit)
  const savingsCount = useCountUp(Math.abs(netSavings))

  const recentTx = transactions
    .filter(t => t.debit && t.debit > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const analysis = latestAnalysis?.parsed_analysis

  return (
    <>
      <style>{`
        .dash-page { min-height: 100vh; background: var(--surface-0); }

        /* Header */
        .dash-header {
          padding: 18px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: rgba(6,11,38,0.85);
          backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .dash-header-left { min-width: 0; }
        .dash-header-month {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          white-space: nowrap;
          letter-spacing: -0.02em;
        }
        .dash-header-sub {
          font-size: 10px;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.1em;
          margin-top: 2px;
        }
        .dash-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .dash-select {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.8);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          outline: none;
          cursor: pointer;
          max-width: 130px;
        }
        .dash-ai-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 7px 12px;
          background: rgba(67,24,255,0.15);
          border: 1px solid rgba(67,24,255,0.3);
          border-radius: 8px;
          color: #868cff;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-decoration: none;
          white-space: nowrap;
        }

        /* Content */
        .dash-content { padding: 20px 28px; max-width: 1400px; }

        /* Stat grid — 3 cols desktop */
        .dash-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }

        /* Charts — side by side desktop */
        .dash-charts { display: grid; grid-template-columns: 1fr 360px; gap: 14px; margin-bottom: 20px; }

        /* Bottom — side by side desktop */
        .dash-bottom { display: grid; grid-template-columns: 1fr 300px; gap: 14px; }

        /* Cards */
        .vcard {
          background: linear-gradient(127.09deg, rgba(6,11,40,0.9) 19.41%, rgba(10,14,35,0.6) 76.65%);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          overflow: hidden;
        }
        .vcard-head {
          padding: 16px 18px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .vcard-title {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.4);
        }
        .vcard-body { padding: 12px 18px 18px; }

        /* Stat card */
        .scard {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 18px;
          position: relative;
          overflow: hidden;
        }
        .scard-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.35);
          margin-bottom: 14px;
        }
        .scard-value {
          font-size: 28px;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 16px;
          font-variant-numeric: tabular-nums;
        }
        .scard-currency {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          margin-right: 1px;
          vertical-align: top;
          line-height: 1.8;
        }
        .scard-footer {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
        }
        .scard-bar {
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
          margin-bottom: 10px;
          overflow: hidden;
        }
        .scard-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 100px;
          font-size: 10px;
          font-weight: 600;
          margin-bottom: 14px;
          float: right;
          margin-top: -24px;
        }

        /* Breakpoints */
        @media (max-width: 1024px) {
          .dash-charts { grid-template-columns: 1fr; }
          .dash-bottom { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .dash-header { padding: 12px 16px; top: 56px; }
          .dash-header-month { font-size: 18px; }
          .dash-header-sub { display: none; }
          .dash-content { padding: 14px 14px; }
          .dash-stats { grid-template-columns: 1fr; gap: 10px; margin-bottom: 14px; }
          .dash-charts { grid-template-columns: 1fr; gap: 10px; margin-bottom: 14px; }
          .dash-bottom { grid-template-columns: 1fr; gap: 10px; }
          .scard-value { font-size: 24px; }
          .dash-select { font-size: 11px; padding: 5px 8px; }
        }
        @media (max-width: 400px) {
          .dash-ai-btn span.ai-label { display: none; }
        }
      `}</style>

      <div className="dash-page">
        {/* Header */}
        <header className="dash-header">
          <div className="dash-header-left">
            <div className="dash-header-month">{formatMonth(month)}</div>
            <div className="dash-header-sub">FINANCIAL OVERVIEW</div>
          </div>
          <div className="dash-header-right">
            {savingsRate !== 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '3px 9px', borderRadius: '100px', fontSize: '10px', fontWeight: 600,
                background: savingsRate > 0 ? 'rgba(1,181,116,0.12)' : 'rgba(227,26,26,0.12)',
                color: savingsRate > 0 ? '#01B574' : '#E31A1A',
                whiteSpace: 'nowrap',
              }}>
                {savingsRate > 0 ? '↑' : '↓'} {Math.abs(savingsRate)}%
              </span>
            )}
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="dash-select"
            >
              {months.map(m => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
            <a href="/claude" className="dash-ai-btn">
              ✦ <span className="ai-label">AI ANALYSIS</span>
            </a>
          </div>
        </header>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'rgba(255,255,255,0.25)', fontSize: '12px', letterSpacing: '0.1em' }}>
            LOADING...
          </div>
        ) : (
          <div className="dash-content">

            {/* ── Stat Cards ── */}
            <div className="dash-stats">
              <StatCard
                label="TOTAL INCOME"
                value={incomeCount}
                color="#01B574"
                bg="rgba(1,181,116,0.08)"
                border="rgba(1,181,116,0.15)"
                trend={savingsRate > 0 ? `+${savingsRate}% saved` : undefined}
                trendUp
                sub={`${transactions.filter(t => t.credit).length} credits`}
              />
              <StatCard
                label="TOTAL SPENT"
                value={spentCount}
                color="#E31A1A"
                bg="rgba(227,26,26,0.07)"
                border="rgba(227,26,26,0.14)"
                sub={`${transactions.filter(t => t.debit).length} debits`}
              />
              <StatCard
                label="NET SAVINGS"
                value={savingsCount}
                color="#FFB547"
                bg="rgba(255,181,71,0.07)"
                border="rgba(255,181,71,0.14)"
                prefix={netSavings < 0 ? '-' : '+'}
                sub={`${transactions.length} total txns`}
              />
            </div>

            {/* ── Charts ── */}
            <div className="dash-charts">
              {/* Trend chart */}
              <div className="vcard">
                <div className="vcard-head">
                  <span className="vcard-title">6-MONTH TREND</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>{months[months.length - 1]} → {months[0]}</span>
                </div>
                <div className="vcard-body">
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={trendData} margin={{ top: 5, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="iGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#01B574" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#01B574" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FFB547" stopOpacity={0.18}/>
                          <stop offset="95%" stopColor="#FFB547" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="none" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={44} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="income" stroke="#01B574" strokeWidth={1.5} fill="url(#iGrad)" dot={false} />
                      <Area type="monotone" dataKey="spent" stroke="#FFB547" strokeWidth={1.5} fill="url(#sGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                    {[{ label: 'Income', color: '#01B574' }, { label: 'Spent', color: '#FFB547' }].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                        <div style={{ width: '16px', height: '2px', background: l.color, borderRadius: '2px' }}/>
                        {l.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pie chart */}
              <div className="vcard">
                <div className="vcard-head">
                  <span className="vcard-title">SPENDING BREAKDOWN</span>
                </div>
                <div className="vcard-body">
                  {pieData.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
                      No spending data
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <ResponsiveContainer width={130} height={130}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} strokeWidth={0}>
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={{ background: 'rgba(10,14,50,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ flex: 1, minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pieData.slice(0, 5).map((d, i) => (
                          <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', overflow: 'hidden' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }}/>
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', flexShrink: 0, fontWeight: 600 }}>{formatINRShort(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Bottom Row ── */}
            <div className="dash-bottom">
              {/* AI Analysis */}
              <div className="vcard">
                <div className="vcard-head">
                  <span className="vcard-title">AI ANALYSIS</span>
                  {analysis && (
                    <span style={{
                      padding: '3px 9px', borderRadius: '100px', fontSize: '10px', fontWeight: 600,
                      background: analysis.savings_score >= 7 ? 'rgba(1,181,116,0.12)' : analysis.savings_score >= 4 ? 'rgba(255,181,71,0.12)' : 'rgba(227,26,26,0.12)',
                      color: analysis.savings_score >= 7 ? '#01B574' : analysis.savings_score >= 4 ? '#FFB547' : '#E31A1A',
                    }}>
                      {analysis.savings_score}/10
                    </span>
                  )}
                </div>
                <div className="vcard-body">
                  {!analysis ? (
                    <div style={{ textAlign: 'center', padding: '28px 0' }}>
                      <div style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.3 }}>✦</div>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '18px', lineHeight: 1.6 }}>
                        Import a statement, generate a prompt,<br/>paste Claude&apos;s response to see insights.
                      </p>
                      <a href="/claude" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '9px 18px', background: 'rgba(67,24,255,0.15)', border: '1px solid rgba(67,24,255,0.3)',
                        borderRadius: '8px', color: '#868cff', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textDecoration: 'none',
                      }}>✦ GENERATE ANALYSIS</a>
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>SAVINGS SCORE</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: analysis.savings_score >= 7 ? '#01B574' : '#FFB547' }}>{analysis.savings_score}/10</span>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${analysis.savings_score * 10}%`, background: analysis.savings_score >= 7 ? '#01B574' : analysis.savings_score >= 4 ? '#FFB547' : '#E31A1A', borderRadius: '4px', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }}/>
                        </div>
                      </div>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, marginBottom: '16px' }}>{analysis.summary}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {analysis.suggestions.slice(0, 3).map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 13px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(67,24,255,0.15)', border: '1px solid rgba(67,24,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#868cff', flexShrink: 0 }}>{i + 1}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '2px' }}>{s.title}</div>
                              {s.estimated_saving && <span style={{ fontSize: '10px', color: '#01B574', background: 'rgba(1,181,116,0.1)', padding: '2px 7px', borderRadius: '100px' }}>Save {s.estimated_saving}/mo</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      <a href="/claude" style={{ display: 'inline-block', marginTop: '14px', fontSize: '11px', color: '#868cff', textDecoration: 'none', letterSpacing: '0.04em' }}>VIEW FULL ANALYSIS →</a>
                    </>
                  )}
                </div>
              </div>

              {/* Recent transactions */}
              <div className="vcard">
                <div className="vcard-head">
                  <span className="vcard-title">RECENT</span>
                  <a href="/transactions" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', letterSpacing: '0.04em' }}>ALL →</a>
                </div>
                <div className="vcard-body" style={{ paddingTop: '14px' }}>
                  {recentTx.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: '12px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>No transactions yet</span>
                      <a href="/upload" style={{ fontSize: '11px', color: '#868cff', textDecoration: 'none', letterSpacing: '0.04em' }}>IMPORT STATEMENT →</a>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {recentTx.map((t, i) => (
                        <div key={t.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '9px 0',
                          borderBottom: i < recentTx.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          gap: '8px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
                              {getCategoryIcon(t.category)}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t.merchant_clean || t.description}
                              </div>
                              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{t.date.slice(5)}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: t.debit ? '#E31A1A' : '#01B574', flexShrink: 0 }}>
                            {t.debit ? `-${formatINRShort(t.debit)}` : `+${formatINRShort(t.credit ?? 0)}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  )
}

function StatCard({ label, value, color, bg, border, trend, trendUp, sub, prefix = '' }: {
  label: string; value: number; color: string; bg: string; border: string;
  trend?: string; trendUp?: boolean; sub: string; prefix?: string;
}) {
  return (
    <div className="scard" style={{ background: bg, borderColor: border }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span className="scard-label">{label}</span>
        {trend && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '100px', fontSize: '10px', fontWeight: 600,
            background: trendUp ? 'rgba(1,181,116,0.12)' : 'rgba(227,26,26,0.12)',
            color: trendUp ? '#01B574' : '#E31A1A',
          }}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div className="scard-value" style={{ color }}>
        <span className="scard-currency">₹</span>
        {prefix}{value.toLocaleString('en-IN')}
      </div>
      <div className="scard-bar">
        <div style={{ height: '100%', width: '60%', background: color, opacity: 0.4, borderRadius: '3px' }}/>
      </div>
      <span className="scard-footer">{sub}</span>
    </div>
  )
}

function getCategoryIcon(cat: string): string {
  const icons: Record<string, string> = {
    food_delivery: '🛵', groceries: '🛒', fuel: '⛽', transport: '🚗',
    utilities: '💡', emi_loan: '🏦', rent: '🏠', entertainment: '🎬',
    shopping: '🛍', medical: '💊', salary: '💰', transfer: '↔️', atm: '🏧', other: '📦',
  }
  return icons[cat] ?? '📦'
}
