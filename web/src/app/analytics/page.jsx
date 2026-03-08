'use client'
import { useState, useEffect } from 'react'
import { getMonthlyPL, getCategoryBreakdown, getTopProducts, getTopCustomers, fmt } from '@/lib/supabase'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#22C55E','#2563EB','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316']

export default function AnalyticsPage() {
  const [monthly, setMonthly]       = useState([])
  const [categories, setCategories] = useState({ income:[], expense:[] })
  const [topProducts, setTopP]      = useState([])
  const [topCustomers, setTopC]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [months, setMonths]         = useState(12)

  async function load() {
    setLoading(true)
    const [m, cat, tp, tc] = await Promise.all([
      getMonthlyPL(months),
      getCategoryBreakdown(),
      getTopProducts(5),
      getTopCustomers(5),
    ])
    setMonthly(m)
    setCategories(cat)
    setTopP(tp)
    setTopC(tc)
    setLoading(false)
  }

  useEffect(() => { load() }, [months])

  if (loading) return <LoadingState />

  const totalIncome  = monthly.reduce((s,m) => s + Number(m.total_income || 0), 0)
  const totalExpense = monthly.reduce((s,m) => s + Number(m.total_expense || 0), 0)
  const netProfit    = totalIncome - totalExpense
  const avgMonthly   = monthly.length ? netProfit / monthly.length : 0
  const margin       = totalIncome ? ((netProfit / totalIncome) * 100).toFixed(1) : 0

  const chartData = monthly.map(m => ({
    name: m.month_label?.replace(' 20', "'") || '',
    Income:  Number(m.total_income || 0),
    Expense: Number(m.total_expense || 0),
    Net:     Number(m.net_profit || 0),
  }))

  const incomeBreakdown = categories.income.map((c, i) => ({
    ...c, color: COLORS[i % COLORS.length]
  }))

  const expenseBreakdown = categories.expense.map((c, i) => ({
    ...c, color: COLORS[(i + 3) % COLORS.length]
  }))

  return (
    <div style={{ fontFamily:'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0F2419', margin:0 }}>📈 Analytics & Reports</h1>
          <p style={{ color:'#6B7280', marginTop:4 }}>Deep insights into your business performance</p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[3, 6, 12].map(m => (
            <button key={m} onClick={() => setMonths(m)} style={{
              padding:'8px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
              background: months === m ? '#0F2419' : '#F3F4F6',
              color: months === m ? '#86EFAC' : '#6B7280',
              border:'none', fontFamily:'DM Sans'
            }}>Last {m}m</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:28 }}>
        {[
          { label:'Total Revenue',    value: fmt.currency(totalIncome),  color:'#22C55E', bg:'#F0FDF4' },
          { label:'Total Expenses',   value: fmt.currency(totalExpense), color:'#EF4444', bg:'#FEF2F2' },
          { label:'Net Profit',       value: fmt.currency(netProfit),    color: netProfit >= 0 ? '#22C55E' : '#EF4444', bg:'#F9FAFB' },
          { label:'Avg. Monthly',     value: fmt.currency(avgMonthly),   color:'#2563EB', bg:'#EFF6FF' },
          { label:'Profit Margin',    value: `${margin}%`,              color:'#8B5CF6', bg:'#F5F3FF' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background:bg, borderRadius:14, padding:'16px 18px', border:'1px solid rgba(0,0,0,.06)' }}>
            <p style={{ margin:0, fontSize:11, color:'#9CA3AF', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{label}</p>
            <p style={{ margin:'6px 0 0', fontSize:20, fontWeight:800, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue vs Expense Trend */}
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20, marginBottom:24 }}>
        <div style={{ background:'#fff', borderRadius:20, padding:'24px', border:'1px solid #E5E7EB', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <h3 style={{ margin:'0 0 20px', fontWeight:700, color:'#0F2419', fontSize:16 }}>📊 Revenue vs Expenses Trend</h3>
          {chartData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt.currency(v)} contentStyle={{ borderRadius:12, border:'1px solid #E5E7EB', fontSize:13 }} />
                <Legend />
                <Bar dataKey="Income" fill="#22C55E" radius={[6,6,0,0]} />
                <Bar dataKey="Expense" fill="#EF4444" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Net Profit Trend */}
        <div style={{ background:'#fff', borderRadius:20, padding:'24px', border:'1px solid #E5E7EB', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <h3 style={{ margin:'0 0 20px', fontWeight:700, color:'#0F2419', fontSize:16 }}>📈 Profit Trend</h3>
          {chartData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt.currency(v)} contentStyle={{ borderRadius:12, border:'1px solid #E5E7EB', fontSize:13 }} />
                <Line type="monotone" dataKey="Net" stroke="#0F2419" strokeWidth={3} dot={{ fill:'#22C55E', strokeWidth:2, r:5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Breakdowns */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
        {/* Income by Category */}
        <div style={{ background:'#fff', borderRadius:20, padding:'24px', border:'1px solid #E5E7EB', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <h3 style={{ margin:'0 0 20px', fontWeight:700, color:'#0F2419', fontSize:16 }}>💰 Income by Category</h3>
          {incomeBreakdown.length === 0 ? <EmptyChart message="No income data" /> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={incomeBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={85} innerRadius={50} paddingAngle={3}>
                    {incomeBreakdown.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt.currency(v)} contentStyle={{ borderRadius:12, fontSize:13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:12 }}>
                {incomeBreakdown.map(c => (
                  <div key={c.category} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#6B7280' }}>
                    <div style={{ width:10, height:10, borderRadius:3, background: c.color }} />
                    {c.category}: <strong style={{ color:'#0F2419' }}>{fmt.currency(c.amount)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Expense by Category */}
        <div style={{ background:'#fff', borderRadius:20, padding:'24px', border:'1px solid #E5E7EB', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <h3 style={{ margin:'0 0 20px', fontWeight:700, color:'#0F2419', fontSize:16 }}>📤 Expenses by Category</h3>
          {expenseBreakdown.length === 0 ? <EmptyChart message="No expense data" /> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expenseBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={85} innerRadius={50} paddingAngle={3}>
                    {expenseBreakdown.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt.currency(v)} contentStyle={{ borderRadius:12, fontSize:13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:12 }}>
                {expenseBreakdown.map(c => (
                  <div key={c.category} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#6B7280' }}>
                    <div style={{ width:10, height:10, borderRadius:3, background: c.color }} />
                    {c.category}: <strong style={{ color:'#DC2626' }}>{fmt.currency(c.amount)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Products & Customers */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
        {/* Top Products */}
        <div style={{ background:'#fff', borderRadius:20, padding:'24px', border:'1px solid #E5E7EB', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <h3 style={{ margin:'0 0 20px', fontWeight:700, color:'#0F2419', fontSize:16 }}>🏆 Top Selling Products</h3>
          {topProducts.length === 0 ? <EmptyChart message="No sales data yet" /> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis type="number" tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#9CA3AF' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:12, fill:'#374151' }} width={100} />
                  <Tooltip formatter={(v) => fmt.currency(v)} contentStyle={{ borderRadius:12, fontSize:13 }} />
                  <Bar dataKey="totalRevenue" fill="#22C55E" radius={[0,6,6,0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop:12 }}>
                {topProducts.map((p, i) => (
                  <div key={p.name} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F3F4F6', fontSize:13 }}>
                    <span style={{ color:'#374151' }}>#{i+1} {p.name} <span style={{ color:'#9CA3AF' }}>({p.totalQty} sold)</span></span>
                    <span style={{ fontWeight:700, color:'#22C55E' }}>{fmt.currency(p.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top Customers */}
        <div style={{ background:'#fff', borderRadius:20, padding:'24px', border:'1px solid #E5E7EB', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <h3 style={{ margin:'0 0 20px', fontWeight:700, color:'#0F2419', fontSize:16 }}>👑 Top Customers</h3>
          {topCustomers.length === 0 ? <EmptyChart message="No customer data yet" /> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topCustomers} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis type="number" tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#9CA3AF' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:12, fill:'#374151' }} width={100} />
                  <Tooltip formatter={(v) => fmt.currency(v)} contentStyle={{ borderRadius:12, fontSize:13 }} />
                  <Bar dataKey="totalSpent" fill="#2563EB" radius={[0,6,6,0]} name="Total Spent" />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop:12 }}>
                {topCustomers.map((c, i) => (
                  <div key={c.name} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F3F4F6', fontSize:13 }}>
                    <span style={{ color:'#374151' }}>#{i+1} {c.name} <span style={{ color:'#9CA3AF' }}>({c.invoiceCount} invoices)</span></span>
                    <span style={{ fontWeight:700, color:'#2563EB' }}>{fmt.currency(c.totalSpent)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Monthly P&L Table */}
      <div style={{ background:'#fff', borderRadius:20, padding:'24px', border:'1px solid #E5E7EB', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        <h3 style={{ margin:'0 0 20px', fontWeight:700, color:'#0F2419', fontSize:16 }}>📋 Monthly Profit & Loss Statement</h3>
        {monthly.length === 0 ? (
          <p style={{ textAlign:'center', color:'#9CA3AF', padding:40 }}>No transaction data. Add income and expenses to see your P&L.</p>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F9FAFB' }}>
                  {['Month','Income','Expenses','Net Profit','Margin'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign: h==='Month'?'left':'right', fontSize:12, color:'#6B7280', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => {
                  const inc = Number(m.total_income || 0)
                  const exp = Number(m.total_expense || 0)
                  const net = Number(m.net_profit || 0)
                  const mg = inc ? ((net / inc) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid #F3F4F6' }}>
                      <td style={{ padding:'12px 16px', fontSize:14, fontWeight:600, color:'#0F2419' }}>{m.month_label}</td>
                      <td style={{ padding:'12px 16px', fontSize:14, textAlign:'right', color:'#22C55E', fontWeight:600 }}>{fmt.currency(inc)}</td>
                      <td style={{ padding:'12px 16px', fontSize:14, textAlign:'right', color:'#EF4444', fontWeight:600 }}>{fmt.currency(exp)}</td>
                      <td style={{ padding:'12px 16px', fontSize:14, textAlign:'right', fontWeight:800, color: net >= 0 ? '#22C55E' : '#EF4444' }}>{fmt.currency(net)}</td>
                      <td style={{ padding:'12px 16px', fontSize:13, textAlign:'right', color: Number(mg) >= 0 ? '#6B7280' : '#EF4444' }}>{mg}%</td>
                    </tr>
                  )
                })}
                {/* Totals row */}
                <tr style={{ background:'#F9FAFB', borderTop:'2px solid #E5E7EB' }}>
                  <td style={{ padding:'14px 16px', fontSize:14, fontWeight:800, color:'#0F2419' }}>TOTAL</td>
                  <td style={{ padding:'14px 16px', fontSize:14, textAlign:'right', color:'#22C55E', fontWeight:800 }}>{fmt.currency(totalIncome)}</td>
                  <td style={{ padding:'14px 16px', fontSize:14, textAlign:'right', color:'#EF4444', fontWeight:800 }}>{fmt.currency(totalExpense)}</td>
                  <td style={{ padding:'14px 16px', fontSize:14, textAlign:'right', fontWeight:800, color: netProfit >= 0 ? '#22C55E' : '#EF4444' }}>{fmt.currency(netProfit)}</td>
                  <td style={{ padding:'14px 16px', fontSize:13, textAlign:'right', fontWeight:700, color:'#6B7280' }}>{margin}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyChart({ message = 'No data available yet' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#9CA3AF', fontSize:14 }}>
      {message}
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ height:36, background:'#F3F4F6', borderRadius:8, width:300, marginBottom:32, animation:'pulse 1.5s infinite' }} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:28 }}>
        {[1,2,3,4,5].map(i => <div key={i} style={{ height:80, background:'#F3F4F6', borderRadius:14, animation:'pulse 1.5s infinite' }} />)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20, marginBottom:24 }}>
        {[1,2].map(i => <div key={i} style={{ height:340, background:'#F3F4F6', borderRadius:20, animation:'pulse 1.5s infinite' }} />)}
      </div>
    </div>
  )
}
