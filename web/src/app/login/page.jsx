'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [mode, setMode]       = useState('login') // login | signup
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [bizName, setBiz]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        router.push('/dashboard')
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        // Create business + member
        const { data: biz } = await supabase.from('businesses')
          .insert({ owner_id: data.user.id, name: bizName, email }).select().single()
        await supabase.from('business_members')
          .insert({ business_id: biz.id, user_id: data.user.id, role: 'owner', email, name: bizName })
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg,#0F2419 0%,#1A3A2A 50%,#0F2419 100%)',
      fontFamily:'DM Sans, sans-serif', padding:20
    }}>
      {/* Decorative circles */}
      <div style={{ position:'fixed', top:-100, right:-100, width:400, height:400, borderRadius:'50%', background:'rgba(34,197,94,.06)' }}/>
      <div style={{ position:'fixed', bottom:-150, left:-150, width:500, height:500, borderRadius:'50%', background:'rgba(34,197,94,.04)' }}/>

      <div style={{ width:'100%', maxWidth:440, position:'relative' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{
            width:64, height:64, borderRadius:18,
            background:'linear-gradient(135deg,#22C55E,#16A34A)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            fontSize:32, marginBottom:16, boxShadow:'0 8px 32px rgba(34,197,94,.3)'
          }}>💚</div>
          <h1 style={{ color:'#fff', fontSize:28, fontWeight:800, margin:0, letterSpacing:-.5 }}>CLARITY LEDGER</h1>
          <p style={{ color:'#86EFAC', margin:'4px 0 0', fontSize:14 }}>
            Smart Accounting for Nigerian SMEs
          </p>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(255,255,255,.04)', backdropFilter:'blur(20px)',
          border:'1px solid rgba(255,255,255,.1)', borderRadius:24,
          padding:'36px 40px', boxShadow:'0 24px 64px rgba(0,0,0,.4)'
        }}>
          {/* Tabs */}
          <div style={{ display:'flex', background:'rgba(0,0,0,.3)', borderRadius:12, padding:4, marginBottom:28 }}>
            {['login','signup'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex:1, padding:'10px', border:'none', borderRadius:9, cursor:'pointer',
                fontFamily:'DM Sans, sans-serif', fontWeight:600, fontSize:14, transition:'all .2s',
                background: mode === m ? '#22C55E' : 'transparent',
                color: mode === m ? '#fff' : '#86EFAC'
              }}>{m === 'login' ? 'Sign In' : 'Sign Up'}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {mode === 'signup' && <Input label="Business Name" value={bizName} onChange={setBiz} placeholder="e.g. Clarity Beauty Store" />}
            <Input label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@business.com" />
            <Input label="Password" type="password" value={password} onChange={setPass} placeholder="Min. 8 characters" />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -4 }}>
              <input type="checkbox" id="remember" defaultChecked style={{ accentColor: '#22C55E', cursor: 'pointer' }} />
              <label htmlFor="remember" style={{ color: '#86EFAC', fontSize: 13, cursor: 'pointer' }}>Remember me</label>
            </div>

            {error && <div style={{
              background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)',
              borderRadius:10, padding:'10px 14px', color:'#FCA5A5', fontSize:13
            }}>⚠️ {error}</div>}

            <button type="submit" disabled={loading} style={{
              padding:'14px', background:'linear-gradient(135deg,#22C55E,#16A34A)',
              border:'none', borderRadius:12, color:'#fff', fontWeight:700, fontSize:16,
              cursor: loading ? 'not-allowed' : 'pointer', marginTop:8,
              fontFamily:'DM Sans, sans-serif', opacity: loading ? .7 : 1,
              boxShadow:'0 4px 20px rgba(34,197,94,.3)', transition:'all .2s'
            }}>
              {loading ? '⏳ Please wait...' : mode === 'login' ? '🚀 Sign In' : '🎉 Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', color:'rgba(255,255,255,.4)', fontSize:12, marginTop:24 }}>
          Your data is encrypted and secured. © 2026 Clarity Ledger
        </p>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type='text', placeholder='' }) {
  return (
    <div>
      <label style={{ display:'block', color:'#86EFAC', fontSize:13, fontWeight:600, marginBottom:6 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required
        autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'username' : 'off'}
        style={{
          width:'100%', padding:'12px 14px', background:'rgba(0,0,0,.3)',
          border:'1px solid rgba(255,255,255,.12)', borderRadius:10,
          color:'#fff', fontSize:14, fontFamily:'DM Sans, sans-serif',
          outline:'none', boxSizing:'border-box', transition:'border .2s'
        }}
        onFocus={e => e.target.style.borderColor='#22C55E'}
        onBlur={e  => e.target.style.borderColor='rgba(255,255,255,.12)'}
      />
    </div>
  )
}
