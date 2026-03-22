'use client'

import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid
} from 'recharts'

const MOCK_TREND = [
  { month: 'Oct', income: 85000, spent: 62000 },
  { month: 'Nov', income: 85000, spent: 74000 },
  { month: 'Dec', income: 95000, spent: 88000 },
  { month: 'Jan', income: 85000, spent: 58000 },
  { month: 'Feb', income: 85000, spent: 67000 },
  { month: 'Mar', income: 90000, spent: 61400 },
]

const MOCK_PIE = [
  { name: 'Food & Delivery', value: 14200 },
  { name: 'Groceries', value: 9800 },
  { name: 'Fuel', value: 7600 },
  { name: 'EMIs', value: 18000 },
  { name: 'Entertainment', value: 4200 },
  { name: 'Shopping', value: 7600 },
]

const MOCK_RECENT = [
  { id: 1, icon: '🛵', name: 'Swiggy', date: '22 Mar', amount: -840, positive: false },
  { id: 2, icon: '⛽', name: 'BPCL Petrol', date: '21 Mar', amount: -3200, positive: false },
  { id: 3, icon: '💰', name: 'Salary Credit', date: '20 Mar', amount: 90000, positive: true },
  { id: 4, icon: '🛒', name: 'BigBasket', date: '19 Mar', amount: -2340, positive: false },
  { id: 5, icon: '🎬', name: 'Netflix', date: '18 Mar', amount: -649, positive: false },
]

const MOCK_SUGGESTIONS = [
  { n: 1, title: 'Cut food delivery to 8 orders/month', saving: '₹4,200' },
  { n: 2, title: 'Switch Airtel to prepaid plan', saving: '₹800' },
  { n: 3, title: 'Cancel unused OTT subscriptions', saving: '₹1,100' },
]

const PIE_COLORS = ['#C9943F', '#2BA86A', '#D94F4F', '#3D7EC8', '#8B6FD4', '#E07A40']

const navLinks = [
  { href: '/dashboard', label: 'Overview', icon: '⊞' },
  { href: '/upload', label: 'Import', icon: '↑' },
  { href: '/transactions', label: 'Transactions', icon: '≡' },
  { href: '/recurring', label: 'Recurring', icon: '↺' },
  { href: '/plan', label: 'Plan', icon: '⊡' },
  { href: '/claude', label: 'AI Analysis', icon: '✦', active: false },
]

function fmt(n: number) {
  return Math.abs(n).toLocaleString('en-IN')
}
function fmtShort(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${n}`
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-bright)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
      <div style={{ color: 'var(--muted-foreground)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.name === 'income' ? 'var(--emerald)' : 'var(--gold)', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ textTransform: 'capitalize' }}>{p.name}</span>
          <span>{fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function DemoPage() {
  const [activeNav] = useState('Overview')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-0)' }}>
      {/* ── Sidebar ── */}
      <aside style={{ width: '210px', minWidth: '210px', background: 'var(--sidebar)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{ width: '26px', height: '26px', background: 'var(--gold-dim)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--gold)' }}>₹</div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>Finance</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {navLinks.map(({ href, label, icon }) => {
            const isActive = label === activeNav
            return (
              <a key={label} href={href} className={isActive ? 'nav-item active' : 'nav-item'}>
                <span style={{ color: isActive ? 'var(--gold)' : 'inherit', opacity: isActive ? 1 : 0.5 }}>{icon}</span>
                <span>{label}</span>
              </a>
            )
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
          <div className="nav-item" style={{ cursor: 'default' }}>
            <span style={{ opacity: 0.4 }}>→</span>
            <span>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Header */}
        <header style={{ padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-1)', position: 'sticky', top: 0, zIndex: 40 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--foreground)', letterSpacing: '-0.01em' }}>March 2026</div>
            <div style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '2px', letterSpacing: '0.05em' }}>FINANCIAL OVERVIEW</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="pill pill-emerald">↑ 32% savings rate</span>
            <select style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: '8px', padding: '6px 12px', fontFamily: 'var(--font-mono-custom)', fontSize: '12px', outline: 'none', cursor: 'pointer', colorScheme: 'dark' }}>
              <option>March 2026</option>
              <option>February 2026</option>
            </select>
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'var(--gold-dim)', border: '1px solid rgba(201,148,63,0.3)', borderRadius: '8px', color: 'var(--gold-light)', fontFamily: 'var(--font-mono-custom)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer' }}>
              ✦ AI ANALYSIS
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: '28px 32px', flex: 1 }}>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'TOTAL INCOME', value: '90,000', color: 'var(--emerald)', dim: 'var(--emerald-dim)', trend: '↑ +5.9%', txns: '3 txns' },
              { label: 'TOTAL SPENT', value: '61,400', color: 'var(--rose)', dim: 'var(--rose-dim)', trend: '↓ -8.3%', txns: '47 txns' },
              { label: 'NET SAVINGS', value: '28,600', prefix: '+', color: 'var(--gold)', dim: 'var(--gold-dim)', txns: '50 txns' },
            ].map(({ label, value, color, dim, trend, txns, prefix }) => (
              <div key={label} style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.14em', color: 'var(--muted-foreground)' }}>{label}</span>
                  {trend && <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '10px', color: trend.startsWith('↑') ? 'var(--emerald)' : 'var(--rose)', background: trend.startsWith('↑') ? 'var(--emerald-dim)' : 'var(--rose-dim)', padding: '2px 7px', borderRadius: '100px' }}>{trend}</span>}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '11px', color: 'var(--muted-foreground)', marginRight: '2px' }}>₹</span>
                  <span style={{ fontFamily: 'var(--font-mono-custom)', fontWeight: 500, fontSize: '32px', letterSpacing: '-0.02em', lineHeight: 1, color }}>{prefix}{value}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ height: '2px', flex: 1, background: 'var(--surface-3)', borderRadius: '2px', marginRight: '12px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '60%', background: color, opacity: 0.5, borderRadius: '2px' }}/>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '10px', color: 'var(--muted-foreground)' }}>{txns}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px', marginBottom: '24px' }}>
            {/* Trend */}
            <div className="pcard">
              <div className="pcard-header">
                <div className="pcard-title">6-MONTH TREND</div>
                <div style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '10px', color: 'var(--muted-foreground)' }}>Oct 2025 → Mar 2026</div>
              </div>
              <div className="pcard-body" style={{ paddingTop: '8px' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={MOCK_TREND} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2BA86A" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#2BA86A" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C9943F" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#C9943F" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="none" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="month" tick={{ fill: '#5A6070', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#5A6070', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={44} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="income" stroke="#2BA86A" strokeWidth={1.5} fill="url(#ig)" dot={false} />
                    <Area type="monotone" dataKey="spent" stroke="#C9943F" strokeWidth={1.5} fill="url(#sg)" dot={false} />
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

            {/* Pie */}
            <div className="pcard">
              <div className="pcard-header">
                <div className="pcard-title">SPENDING BREAKDOWN</div>
              </div>
              <div className="pcard-body" style={{ paddingTop: '8px' }}>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={MOCK_PIE} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={2} strokeWidth={0}>
                      {MOCK_PIE.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{ background: 'var(--surface-3)', border: '1px solid var(--border-bright)', borderRadius: '8px', fontFamily: 'var(--font-mono-custom)', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {MOCK_PIE.slice(0, 4).map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: PIE_COLORS[i], flexShrink: 0 }}/>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--muted-foreground)' }}>{d.name}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '11px', color: 'var(--foreground)' }}>₹{d.value.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
            {/* AI Analysis */}
            <div className="pcard">
              <div className="pcard-header">
                <div className="pcard-title">AI ANALYSIS</div>
                <span className="pill pill-emerald">7/10 score</span>
              </div>
              <div className="pcard-body">
                {/* Score bar */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '11px', color: 'var(--muted-foreground)' }}>SAVINGS SCORE</span>
                    <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '11px', color: 'var(--emerald)' }}>7/10</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '70%', background: 'var(--emerald)', borderRadius: '4px' }}/>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--foreground)', lineHeight: 1.65, marginBottom: '20px', opacity: 0.85 }}>
                  Your finances are in solid shape this month. Income held steady at ₹90,000 and spending dropped 8.3% vs last month. EMIs consume 29% of take-home — consider building a 3-month emergency fund before increasing discretionary spending. Food delivery is your most controllable category at ₹14,200.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {MOCK_SUGGESTIONS.map((s) => (
                    <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid rgba(201,148,63,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono-custom)', fontSize: '10px', color: 'var(--gold)', flexShrink: 0 }}>{s.n}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground)', marginBottom: '4px' }}>{s.title}</div>
                        <span className="pill pill-emerald" style={{ fontSize: '10px', padding: '2px 8px' }}>Save {s.saving}/mo</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent */}
            <div className="pcard">
              <div className="pcard-header">
                <div className="pcard-title">RECENT</div>
                <span style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '10px', color: 'var(--muted-foreground)', letterSpacing: '0.05em', cursor: 'pointer' }}>ALL →</span>
              </div>
              <div className="pcard-body" style={{ paddingTop: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {MOCK_RECENT.map((t, i) => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < MOCK_RECENT.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>{t.icon}</div>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--foreground)' }}>{t.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '10px', color: 'var(--muted-foreground)', marginTop: '1px' }}>{t.date}</div>
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono-custom)', fontSize: '12px', color: t.positive ? 'var(--emerald)' : 'var(--rose)', flexShrink: 0, marginLeft: '8px' }}>
                        {t.positive ? '+' : '-'}₹{fmt(t.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
