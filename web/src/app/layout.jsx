'use client'
import './globals.css'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const NAV = [
  { href: '/dashboard',    icon: '📊', label: 'Dashboard'       },
  { href: '/transactions', icon: '💰', label: 'Income & Expense' },
  { href: '/sales',        icon: '🛒', label: 'Sales & Invoices' },
  { href: '/stock',        icon: '📦', label: 'Stock'            },
  { href: '/customers',    icon: '👥', label: 'Customers'        },
  { href: '/suppliers',    icon: '🏭', label: 'Suppliers'        },
  { href: '/purchases',    icon: '📥', label: 'Purchases'        },
  { href: '/analytics',    icon: '📈', label: 'Analytics'        },
]

export default function RootLayout({ children }) {
  const [user, setUser]         = useState(null)
  const [business, setBusiness] = useState(null)
  const [open, setOpen]         = useState(false)
  const pathname = usePathname()
  const router   = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user && !['/login','/signup','/onboard'].includes(pathname)) router.push('/login')
      setUser(data.user)
    })
    supabase.from('businesses').select('*').single().then(({ data }) => setBusiness(data))
  }, [])

  const isAuth = ['/login','/signup','/onboard'].includes(pathname)

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Clarity Ledger — Smart Accounting for Nigerian SMEs</title>
        <meta name="description" content="Clarity Ledger helps Nigerian small businesses track income, expenses, invoices, stock, and more." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet" />
      </head>
      <body>
        {isAuth ? children : (
          <div style={{ display:'flex', minHeight:'100vh', fontFamily:'DM Sans, sans-serif', background:'#F7F8FA' }}>
            {/* Sidebar */}
            <aside style={{
              width: open ? 240 : 72, transition: 'width .25s',
              background: 'linear-gradient(180deg, #0F2419 0%, #132E1F 50%, #0F2419 100%)',
              display:'flex', flexDirection:'column',
              position:'fixed', top:0, left:0, height:'100vh', zIndex:100,
              boxShadow: '4px 0 24px rgba(0,0,0,.35)'
            }}>
              {/* Logo */}
              <div style={{ padding:'20px 16px', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{
                    width:40, height:40, borderRadius:12,
                    background:'linear-gradient(135deg,#22C55E,#16A34A)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:20, flexShrink:0,
                    boxShadow:'0 4px 12px rgba(34,197,94,.3)'
                  }}>💚</div>
                  {open && <div>
                    <div style={{ color:'#fff', fontWeight:800, fontSize:15, letterSpacing:-.3 }}>CLARITY</div>
                    <div style={{ color:'#86EFAC', fontSize:11, marginTop:-2 }}>LEDGER</div>
                  </div>}
                </div>
              </div>

              {/* Toggle */}
              <button onClick={() => setOpen(!open)} style={{
                margin:'8px auto', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)',
                borderRadius:8, padding:'6px 10px', color:'#86EFAC', cursor:'pointer', fontSize:14,
                transition:'all .2s'
              }}>{open ? '◀' : '▶'}</button>

              {/* Nav Links */}
              <nav style={{ flex:1, padding:'8px 10px', display:'flex', flexDirection:'column', gap:2 }}>
                {NAV.map(({ href, icon, label }) => {
                  const active = pathname.startsWith(href)
                  return (
                    <Link key={href} href={href} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'10px 10px',
                      borderRadius:10, textDecoration:'none', transition:'all .2s',
                      background: active ? 'rgba(34,197,94,.15)' : 'transparent',
                      border: active ? '1px solid rgba(34,197,94,.25)' : '1px solid transparent',
                    }}>
                      <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
                      {open && <span style={{ color: active ? '#86EFAC' : '#CBD5E1', fontSize:14, fontWeight: active ? 600 : 400 }}>{label}</span>}
                    </Link>
                  )
                })}
              </nav>

              {/* Business info + logout */}
              <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,.08)' }}>
                {open && business && <div style={{ color:'#86EFAC', fontSize:12, marginBottom:8, padding:'0 4px' }}>
                  🏢 {business.name}
                </div>}
                <button onClick={() => { supabase.auth.signOut(); router.push('/login') }} style={{
                  width:'100%', padding:'8px 10px', background:'rgba(239,68,68,.1)',
                  border:'1px solid rgba(239,68,68,.2)', borderRadius:8,
                  color:'#FCA5A5', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:8,
                  fontFamily:'DM Sans, sans-serif'
                }}>
                  <span>🚪</span>{open && 'Sign Out'}
                </button>
              </div>
            </aside>

            {/* Main content */}
            <main style={{ marginLeft: open ? 240 : 72, flex:1, transition:'margin .25s', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
              {/* Top Navigation */}
              <header style={{
                height: 64, background: '#fff', borderBottom: '1px solid #E5E7EB',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 32px', position: 'sticky', top: 0, zIndex: 90,
                boxShadow: '0 2px 4px rgba(0,0,0,.02)'
              }}>
                <div style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>
                  {business ? `🏢 ${business.name}` : 'Clarity Ledger'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right', display: open ? 'none' : 'block' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F2419' }}>{user?.email?.split('@')[0]}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>Business Owner</div>
                  </div>
                  <button 
                    onClick={() => { supabase.auth.signOut().then(() => router.push('/login')) }}
                    style={{
                      background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 10,
                      padding: '8px 16px', color: '#DC2626', fontWeight: 600, fontSize: 13,
                      cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 6
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}
                  >
                    <span>Logout</span> 🚪
                  </button>
                </div>
              </header>

              <div style={{ padding: '32px', flex: 1 }}>
                {children}
              </div>
            </main>
          </div>
        )}
      </body>
    </html>
  )
}
