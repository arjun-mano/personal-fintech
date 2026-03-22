'use client'

import { useState, useEffect } from 'react'
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
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Detect mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      if (!e.matches) setOpen(false)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = (isMobile && open) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobile, open])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const baseStyle: React.CSSProperties = {
    background: 'linear-gradient(111.84deg, rgba(6, 11, 38, 0.97) 59.3%, rgba(26, 31, 55, 0.85) 100%)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
  }

  const desktopStyle: React.CSSProperties = {
    ...baseStyle,
    width: '230px',
    minWidth: '230px',
    height: '100vh',
    position: 'sticky',
    top: 0,
    flexShrink: 0,
  }

  const mobileStyle: React.CSSProperties = {
    ...baseStyle,
    width: '230px',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: open ? 0 : '-260px',
    zIndex: 50,
    transition: 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  }

  return (
    <>
      {/* Mobile top bar */}
      {isMobile && (
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: '56px',
          background: 'rgba(6, 11, 38, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
        }}>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', borderRadius: '8px' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg, #4318ff, #868cff)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#fff', fontWeight: 700 }}>₹</div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Finance</span>
          </div>
          <div style={{ width: '36px' }} />
        </header>
      )}

      {/* Backdrop */}
      {isMobile && open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            zIndex: 49,
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={isMobile ? mobileStyle : desktopStyle}>
        {/* Close button — mobile only */}
        {isMobile && (
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            style={{ position: 'absolute', top: '16px', right: '16px', width: '30px', height: '30px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        {/* Logo */}
        <div style={{ padding: '24px 20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #4318ff, #868cff)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: '#fff', fontWeight: 700, boxShadow: '0 4px 14px rgba(67,24,255,0.4)', flexShrink: 0 }}>₹</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Finance</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', marginTop: '1px' }}>Personal</div>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 20px' }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {links.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className={active ? 'nav-item active' : 'nav-item'}>
                <span style={{ color: active ? '#868cff' : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleSignOut} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ opacity: 0.45 }}>
              <path d="M9 2H3a1 1 0 00-1 1v9a1 1 0 001 1h6M6 7.5h8M11 5l2.5 2.5L11 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Push content below mobile top bar */}
      {isMobile && <div style={{ height: '56px', flexShrink: 0, display: 'none' }} />}
    </>
  )
}
