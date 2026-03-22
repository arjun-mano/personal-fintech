'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatMonth, currentMonth, prevMonths } from '@/lib/utils'
import { CATEGORY_LABELS } from '@/lib/categorizer'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
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

const PIE_COLORS = ['#C9943F', '#2BA86A', '#D94F4F', '#3D7EC8', '#8B6FD4', '#E07A40', '#4AB8A0', '#9B6B6B']

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-3)',
      border: '1px solid var(--border-bright)',
      borderRadius: '8px',
      padding: '10px 14px',
      fontFamily: 'var(--font-mono-custom)',
      fontSize: '12px',
    }}>
      <div style={{ color: 'var(--muted-foreground)', marginBottom: 6, letterSpacing: '0.05em' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.name === 'income' ? 'var(--emerald)' : 'var(--gold)', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ textTransform: 'capitalize' }}>{p.name}</span>
          <span>{formatINRShort(p.value)}</span>
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
    <div className="noise-overlay" style={{ minHeight: '100vh', background: 'var(--surface-0)' }}>
      {/* Top header */}
      <header style={{
        padding: '20px 32px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface-1)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
            {formatMonth(month)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '2px', letterSpacing: '0.05em' }}>
            FINANCIAL OVERVIEW
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {savingsRate !== 0 && (
            <span className={`pill ${savingsRate > 0 ? 'pill-emerald' : 'pill-rose'}`}>
              {savingsRate > 0 ? '↑' : '↓'} {Math.abs(savingsRate)}% savings rate
            </span>
          )}
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontFamily: 'var(--font-mono-custom)',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {months.map(m => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
          <a href="/claude" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            background: 'var(--gold-dim)',
            border: '1px solid rgba(201,148,63,0.3)',
            borderRadius: '8px',
            color: 'var(--gold-light)',
            fontFamily: 'var(--font-mono-custom)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            ✦ AI ANALYSIS
          </a>
        </div>
      </header>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono-custom)', fontSize: '12px', letterSpacing: '0.1em' }}>
          LOADING DATA...
        </div>
      ) : (
        <div style={{ padding: '28px 32px', maxWidth: '1400px' }}>

          {/* ── Stat Cards Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <StatCard
              label="TOTAL INCOME"
              value={incomeCount}
              variant="emerald"
              trend="+2.4%"
              trendUp
              delay="delay-1"
              transactions={transactions.filter(t => t.credit).length}
            />
            <StatCard
              label="TOTAL SPENT"
              value={spentCount}
              variant="rose"
              trend="-1.2%"
              trendUp={false}
              delay="delay-2"
              transactions={transactions.filter(t => t.debit).length}
            />
            <StatCard
              label="NET SAVINGS"
              value={savingsCount}
              variant="gold"
              prefix={netSavings < 0 ? '-' : '+'}
              delay="delay-3"
              transactions={transactions.length}
            />
          </div>

          {/* ── Charts Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px', marginBottom: '24px' }}>
            {/* Area chart — 6 month trend */}
            <div className="pcard animate-in delay-4">
              <div className="pcard-header">
                <div className="pcard-title">6-MONTH TREND</div>
                <div style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '10px', color: 'var(--muted-foreground)' }}>
                  {months[months.length - 1]} → {months[0]}
                </div>
              </div>
              <div className="pcard-body" style={{ paddingTop: '8px' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2BA86A" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#2BA86A" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C9943F" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#C9943F" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="none" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="month" tick={{ fill: '#5A6070', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#5A6070', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} width={48} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="income" stroke="#2BA86A" strokeWidth={1.5} fill="url(#incomeGrad)" dot={false} />
                    <Area type="monotone" dataKey="spent" stroke="#C9943F" strokeWidth={1.5} fill="url(#spentGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                  {[{ label: 'Income', color: '#2BA86A' }, { label: 'Spent', color: '#C9943F' }].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono-custom)', fontSize: '10px', color: 'var(--muted-foreground)' }}>
                      <div style={{ width: '16px', height: '2px', background: l.color, borderRadius: '2px' }}/>
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pie chart — category breakdown */}
            <div className="pcard animate-in delay-4">
              <div className="pcard-header">
                <div className="pcard-title">SPENDING BREAKDOWN</div>
              </div>
              <div className="pcard-body" style={{ paddingTop: '8px' }}>
                {pieData.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono-custom)', fontSize: '11px' }}>
                    No spending data
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={2} strokeWidth={0}>
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={{ background: 'var(--surface-3)', border: '1px solid var(--border-bright)', borderRadius: '8px', fontFamily: 'var(--font-mono-custom)', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {pieData.slice(0, 4).map((d, i) => (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }}/>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{d.name}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '11px', color: 'var(--foreground)' }}>{formatINRShort(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Bottom Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
            {/* AI Analysis card */}
            <div className="pcard animate-in delay-5">
              <div className="pcard-header">
                <div className="pcard-title">AI ANALYSIS</div>
                {analysis && (
                  <span className={`pill ${analysis.savings_score >= 7 ? 'pill-emerald' : analysis.savings_score >= 4 ? 'pill-gold' : 'pill-rose'}`}>
                    {analysis.savings_score}/10 score
                  </span>
                )}
              </div>
              <div className="pcard-body">
                {!analysis ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--muted-foreground)', fontStyle: 'italic', marginBottom: '12px' }}>No analysis yet</div>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '13px', marginBottom: '20px' }}>Generate a prompt, paste into Claude.ai, and view your personalized financial insights.</p>
                    <a href="/claude" style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '10px 20px', background: 'var(--gold-dim)', border: '1px solid rgba(201,148,63,0.25)',
                      borderRadius: '8px', color: 'var(--gold-light)', fontFamily: 'var(--font-mono-custom)',
                      fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textDecoration: 'none',
                    }}>✦ GENERATE ANALYSIS</a>
                  </div>
                ) : (
                  <div>
                    {/* Score bar */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '11px', color: 'var(--muted-foreground)' }}>SAVINGS SCORE</span>
                        <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '11px', color: analysis.savings_score >= 7 ? 'var(--emerald)' : 'var(--gold)' }}>{analysis.savings_score}/10</span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${analysis.savings_score * 10}%`,
                          background: analysis.savings_score >= 7 ? 'var(--emerald)' : analysis.savings_score >= 4 ? 'var(--gold)' : 'var(--rose)',
                          borderRadius: '4px',
                          transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}/>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--foreground)', lineHeight: 1.65, marginBottom: '20px', opacity: 0.85 }}>{analysis.summary}</p>
                    {/* Suggestions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {analysis.suggestions.slice(0, 3).map((s, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '12px',
                          padding: '12px 14px', background: 'var(--surface-2)',
                          borderRadius: '8px', border: '1px solid var(--border)',
                        }}>
                          <div style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            background: 'var(--gold-dim)', border: '1px solid rgba(201,148,63,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-mono-custom)', fontSize: '10px', color: 'var(--gold)',
                            flexShrink: 0,
                          }}>{i + 1}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground)', marginBottom: '2px' }}>{s.title}</div>
                            {s.estimated_saving && (
                              <span className="pill pill-emerald" style={{ fontSize: '10px', padding: '2px 8px' }}>Save {s.estimated_saving}/mo</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <a href="/claude" style={{ display: 'inline-block', marginTop: '16px', fontFamily: 'var(--font-mono-custom)', fontSize: '11px', color: 'var(--gold)', textDecoration: 'none', letterSpacing: '0.05em' }}>
                      VIEW FULL ANALYSIS →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Recent transactions */}
            <div className="pcard animate-in delay-6">
              <div className="pcard-header">
                <div className="pcard-title">RECENT</div>
                <a href="/transactions" style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '10px', color: 'var(--muted-foreground)', textDecoration: 'none', letterSpacing: '0.05em' }}>ALL →</a>
              </div>
              <div className="pcard-body" style={{ paddingTop: '12px' }}>
                {recentTx.length === 0 ? (
                  <div style={{ color: 'var(--muted-foreground)', fontSize: '12px', textAlign: 'center', padding: '24px 0', fontFamily: 'var(--font-mono-custom)' }}>
                    No transactions
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {recentTx.map((t, i) => (
                      <div key={t.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 0',
                        borderBottom: i < recentTx.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '8px',
                            background: 'var(--surface-3)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', flexShrink: 0,
                          }}>
                            {getCategoryIcon(t.category)}
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                              {t.merchant_clean || t.description}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '10px', color: 'var(--muted-foreground)', marginTop: '1px' }}>
                              {t.date.slice(5)}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '12px', color: t.debit ? 'var(--rose)' : 'var(--emerald)', flexShrink: 0, marginLeft: '8px' }}>
                          {t.debit ? `-${formatINRShort(t.debit)}` : `+${formatINRShort(t.credit ?? 0)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {transactions.length === 0 && (
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <a href="/upload" style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '11px', color: 'var(--gold)', textDecoration: 'none', letterSpacing: '0.05em' }}>
                      IMPORT STATEMENT →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, variant, trend, trendUp, delay, prefix = '', transactions }: {
  label: string; value: number; variant: 'emerald' | 'rose' | 'gold'; trend?: string; trendUp?: boolean; delay: string; prefix?: string; transactions: number;
}) {
  const colors = {
    emerald: { accent: 'var(--emerald)', dim: 'var(--emerald-dim)', border: 'rgba(43,168,106,0.2)' },
    rose: { accent: 'var(--rose)', dim: 'var(--rose-dim)', border: 'rgba(217,79,79,0.2)' },
    gold: { accent: 'var(--gold)', dim: 'var(--gold-dim)', border: 'rgba(201,148,63,0.2)' },
  }[variant]

  return (
    <div className={`stat-card ${variant} animate-in ${delay}`} style={{ ['--glow-color' as string]: colors.dim }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <span style={{
          fontFamily: 'var(--font-mono-custom)', fontSize: '9px', fontWeight: 600,
          letterSpacing: '0.14em', color: 'var(--muted-foreground)',
        }}>{label}</span>
        {trend && (
          <span style={{
            fontFamily: 'var(--font-mono-custom)', fontSize: '10px',
            color: trendUp ? 'var(--emerald)' : 'var(--rose)',
            background: trendUp ? 'var(--emerald-dim)' : 'var(--rose-dim)',
            padding: '2px 7px', borderRadius: '100px',
          }}>{trendUp ? '↑' : '↓'} {trend}</span>
        )}
      </div>
      {/* Value */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '11px', color: 'var(--muted-foreground)', marginRight: '2px' }}>₹</span>
        <span className="stat-number" style={{ fontSize: '32px', color: colors.accent }}>
          {prefix}{value.toLocaleString('en-IN')}
        </span>
      </div>
      {/* Bottom */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ height: '2px', flex: 1, background: 'var(--surface-3)', borderRadius: '2px', marginRight: '12px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '60%', background: colors.accent, opacity: 0.5, borderRadius: '2px' }}/>
        </div>
        <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '10px', color: 'var(--muted-foreground)' }}>
          {transactions} txns
        </span>
      </div>
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
