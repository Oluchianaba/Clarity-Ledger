'use client'
import { useState, useEffect } from 'react'
import { getDashboardKPIs, getMonthlyPL, fmt } from '@/lib/supabase'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function DashboardPage() {
  const [kpis, setKPIs]       = useState(null)
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboardKPIs(), getMonthlyPL(12)]).then(([k, m]) => {
      setKPIs(k); setMonthly(m); setLoading(false)
    })
  }, [])

  if (loading) return <LoadingState />

  const cards = [
    { label:'Total Income',    value: fmt.currency(kpis.totalIncome),   icon:'💰', color:'#22C55E', bg:'rgba(34,197,94,.1)',  border:'rgba(34,197,94,.2)'  },
    { label:'Total Expense',   value: fmt.currency(kpis.totalExpenses), icon:'📤', color:'#EF4444', bg:'rgba(239,68,68,.1)',  border:'rgba(239,68,68,.2)'  },
    { label:'Net Profit',      value: fmt.currency(kpis.netProfit),     icon:'📈', color: kpis.netProfit >= 0 ? '#22C55E' : '#EF4444', bg:'rgba(34,197,94,.07)', border:'rgba(34,197,94,.15)' },
    { label:'Unpaid Invoices', value: fmt.currency(kpis.totalAR),       icon:'⏳', color:'#F59E0B', bg:'rgba(245,158,11,.1)', border:'rgba(245,158,11,.2)' },
    { label:'Owe Suppliers',   value: fmt.currency(kpis.totalAP),       icon:'📥', color:'#8B5CF6', bg:'rgba(139,92,246,.1)', border:'rgba(139,92,246,.2)' },
    { label:'Low Stock Items', value: kpis.lowStock.length,             icon:'🔴', color:'#EF4444', bg:'rgba(239,68,68,.07)', border:'rgba(239,68,68,.15)' },
  ]

  const chartData = monthly.map(m => ({
    name: m.month_label?.replace(' 20','\''),
    Income:  Number(m.total_income),
    Expense: Number(m.total_expense),
    Net:     Number(m.net_profit),
  }))

  return (
    <div style={{ fontFamily:'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:800, color:'#0F2419', margin:0 }}>
          📊 Business Dashboard
        </h1>
        <p style={{ color:'#6B7280', marginTop:4, fontSize:15 }}>
          Your business performance at a glance — {new Date().toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:32 }}>
        {cards.map(({ label, value, icon, color, bg, border }) => (
          <div key={label} style={{
            background:'#fff', borderRadius:16, padding:'20px 22px',
            border:`1px solid ${border}`, boxShadow:'0 2px 8px rgba(0,0,0,.04)',
            transition:'transform .2s', cursor:'default'
          }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <p style={{ margin:0, fontSize:12, color:'#9CA3AF', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{label}</p>
                <p style={{ margin:'8px 0 0', fontSize:22, fontWeight:800, color }}>{value}</p>
              </div>
              <div style={{ width:44, height:44, borderRadius:12, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                {icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20, marginBottom:24 }}>
        {/* Income vs Expense Bar */}
        <div style={{ background:'#fff', borderRadius:20, padding:'24px', border:'1px solid #E5E7EB', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <h3 style={{ margin:'0 0 20px', fontWeight:700, color:'#0F2419', fontSize:16 }}>📊 Income vs Expense by Month</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize:12, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmt.currency(v)} contentStyle={{ borderRadius:12, border:'1px solid #E5E7EB', fontSize:13 }} />
              <Legend />
              <Bar dataKey="Income"  fill="#22C55E" radius={[6,6,0,0]} />
              <Bar dataKey="Expense" fill="#EF4444" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Net Profit Line */}
        <div style={{ background:'#fff', borderRadius:20, padding:'24px', border:'1px solid #E5E7EB', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <h3 style={{ margin:'0 0 20px', fontWeight:700, color:'#0F2419', fontSize:16 }}>📈 Net Profit Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmt.currency(v)} contentStyle={{ borderRadius:12, border:'1px solid #E5E7EB', fontSize:13 }} />
              <Line type="monotone" dataKey="Net" stroke="#0F2419" strokeWidth={3} dot={{ fill:'#22C55E', strokeWidth:2, r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {kpis.lowStock.length > 0 && (
        <div style={{ background:'#fff', borderRadius:20, padding:'24px', border:'1px solid #FEE2E2', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <h3 style={{ margin:'0 0 16px', fontWeight:700, color:'#DC2626', fontSize:16 }}>🔴 Low Stock Alerts</h3>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
            {kpis.lowStock.map(p => (
              <div key={p.product_id} style={{
                background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10,
                padding:'8px 14px', fontSize:13, color:'#DC2626', fontWeight:600
              }}>
                {p.name} — {p.available_stock} left
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ height:40, background:'#F3F4F6', borderRadius:8, width:300, animation:'pulse 1.5s infinite' }} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {[1,2,3,4,5,6].map(i => <div key={i} style={{ height:100, background:'#F3F4F6', borderRadius:16, animation:'pulse 1.5s infinite' }} />)}
      </div>
    </div>
  )
}
