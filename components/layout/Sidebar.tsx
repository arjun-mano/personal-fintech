'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/dashboard', label: 'Overview', icon: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )},
  { href: '/upload', label: 'Import', icon: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1v9M4 6.5l3.5-3.5 3.5 3.5M1 11h13v3H1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { href: '/transactions', label: 'Transactions', icon: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1 4h13M1 8h9M1 12h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/recurring', label: 'Recurring', icon: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M12.5 7.5a5 5 0 11-2-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M10.5 1.5l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { href: '/plan', label: 'Plan', icon: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="2" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 1v2M10 1v2M1 6h13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/claude', label: 'AI Analysis', icon: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 7.5h5M7.5 5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )},
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{
      width: '220px',
      minWidth: '220px',
      background: 'var(--sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px 18px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            background: 'var(--gold-dim)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            color: 'var(--gold)',
          }}>₹</div>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--foreground)',
          }}>Finance</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {links.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={active ? 'nav-item active' : 'nav-item'}>
              <span style={{ color: active ? 'var(--gold)' : 'inherit', opacity: active ? 1 : 0.5 }}>{icon}</span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Divider + Sign out */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleSignOut}
          className="nav-item"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ opacity: 0.5 }}>
            <path d="M9 2H3a1 1 0 00-1 1v9a1 1 0 001 1h6M6 7.5h8M11 5l2.5 2.5L11 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
