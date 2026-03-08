'use client'
import { useState, useEffect } from 'react'
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, getBusinessId, fmt, supabase } from '@/lib/supabase'

const CATEGORIES = ['SALES INCOME','📦 COS (Stock)','🏢 OPEX (Running costs)','EQUITY','VAT','OTHER INCOME','OTHER EXPENSE']

export default function TransactionsPage() {
  const [rows, setRows]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShow]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDel]    = useState(null)
  const [filter, setFilter]   = useState({ type:'', category:'', search:'' })
  const [page, setPage]       = useState(0)
  const [form, setForm]       = useState({ date:'', description:'', type:'income', amount:'', category:'' })
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState(null)

  async function load() {
    setLoading(true)
    const { data, count } = await getTransactions({ page, ...filter })
    setRows(data || []); setTotal(count || 0); setLoading(false)
  }

  useEffect(() => { load() }, [page, filter])

  function showToast(msg, type='success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  function openAdd() {
    setForm({ date:'', description:'', type:'income', amount:'', category:'' })
    setEditing(null); setShow(true)
  }

  function openEdit(r) {
    setForm({ date: r.date||'', description: r.description||'', type: r.type||'income', amount: r.amount||'', category: r.category||'' })
    setEditing(r); setShow(true)
  }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) {
        await updateTransaction(editing.id, { ...form, amount: Number(form.amount) })
        showToast('Transaction updated ✅')
      } else {
        const bizId = await getBusinessId()
        const { data: { user } } = await supabase.auth.getUser()
        await addTransaction({ ...form, amount: Number(form.amount), business_id: bizId, recorded_by: user.id })
        showToast('Transaction saved ✅')
      }
      setShow(false); load()
    } catch (err) { showToast(err.message, 'error') }
    setSaving(false)
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteTransaction(deleting.id)
    setDel(null); showToast('Transaction deleted'); load()
  }

  const income  = rows.filter(r=>r.type==='income').reduce((s,r)=>s+Number(r.amount),0)
  const expense = rows.filter(r=>r.type==='expense').reduce((s,r)=>s+Number(r.amount),0)

  return (
    <div style={{ fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0F2419', margin:0 }}>💰 Income & Expense</h1>
          <p style={{ color:'#6B7280', marginTop:4 }}>Record every naira that enters or leaves your business</p>
        </div>
        <button onClick={openAdd} style={{
          padding:'12px 22px', background:'#0F2419', border:'none', borderRadius:12,
          color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', gap:8,
          fontFamily:'DM Sans'
        }}>+ Add Transaction</button>
      </div>

      {/* Summary bar */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:24 }}>
        {[
          { label:'Showing Income',  value: fmt.currency(income),         color:'#22C55E', bg:'#F0FDF4' },
          { label:'Showing Expense', value: fmt.currency(expense),        color:'#EF4444', bg:'#FEF2F2' },
          { label:'Net',             value: fmt.currency(income-expense), color: income>=expense?'#22C55E':'#EF4444', bg:'#F8FAFC' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background:bg, borderRadius:14, padding:'16px 20px', border:'1px solid rgba(0,0,0,.05)' }}>
            <p style={{ margin:0, fontSize:12, color:'#9CA3AF', fontWeight:600 }}>{label}</p>
            <p style={{ margin:'6px 0 0', fontSize:22, fontWeight:800, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:12, marginBottom:20 }}>
        <input
          placeholder="🔍 Search description..."
          value={filter.search} onChange={e => setFilter(f=>({...f,search:e.target.value}))}
          style={{ flex:1, padding:'10px 14px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, fontFamily:'DM Sans' }}
        />
        <select value={filter.type} onChange={e => setFilter(f=>({...f,type:e.target.value}))}
          style={{ padding:'10px 14px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, fontFamily:'DM Sans' }}>
          <option value="">All Types</option>
          <option value="income">💚 Income</option>
          <option value="expense">🔴 Expense</option>
        </select>
        <select value={filter.category || ''} onChange={e => setFilter(f=>({...f,category:e.target.value}))}
          style={{ padding:'10px 14px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, fontFamily:'DM Sans' }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#F9FAFB' }}>
              {['Date','Description','Category','Type','Amount','Actions'].map(h => (
                <th key={h} style={{ padding:'14px 16px', textAlign: h==='Amount'?'right':'left', fontSize:12, color:'#6B7280', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid #E5E7EB' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:60, textAlign:'center', color:'#9CA3AF', fontSize:15 }}>
                No transactions yet. Click <strong>+ Add Transaction</strong> to start recording.
              </td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} style={{ background: i%2===0?'#fff':'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
                <td style={{ padding:'13px 16px', fontSize:13, color:'#374151' }}>{fmt.date(r.date)}</td>
                <td style={{ padding:'13px 16px', fontSize:13, color:'#111827', fontWeight:500, maxWidth:260 }}>{r.description}</td>
                <td style={{ padding:'13px 16px', fontSize:12 }}>
                  {r.category && <span style={{ background:'#F3F4F6', borderRadius:6, padding:'3px 8px', color:'#6B7280' }}>{r.category}</span>}
                </td>
                <td style={{ padding:'13px 16px' }}>
                  <span style={{
                    padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600,
                    background: r.type==='income'?'#DCFCE7':'#FEE2E2',
                    color: r.type==='income'?'#16A34A':'#DC2626'
                  }}>{r.type==='income'?'💚 Income':'🔴 Expense'}</span>
                </td>
                <td style={{ padding:'13px 16px', fontSize:14, fontWeight:700, color: r.type==='income'?'#16A34A':'#DC2626', textAlign:'right' }}>
                  {r.type==='expense'?'-':'+'}  {fmt.currency(r.amount)}
                </td>
                <td style={{ padding:'13px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => openEdit(r)} style={{ padding:'5px 10px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:6, color:'#2563EB', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'DM Sans' }}>✏️</button>
                    <button onClick={() => setDel(r)} style={{ padding:'5px 10px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, color:'#DC2626', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'DM Sans' }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 50 && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderTop:'1px solid #E5E7EB' }}>
            <span style={{ fontSize:13, color:'#6B7280' }}>Showing {page*50+1}–{Math.min((page+1)*50, total)} of {total}</span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{ padding:'6px 14px', border:'1px solid #E5E7EB', borderRadius:8, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>← Prev</button>
              <button onClick={()=>setPage(p=>p+1)} disabled={(page+1)*50>=total} style={{ padding:'6px 14px', border:'1px solid #E5E7EB', borderRadius:8, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Transaction Modal */}
      {showForm && (
        <Modal title={editing ? '✏️ Edit Transaction' : '+ Add Transaction'} onClose={() => setShow(false)}>
          <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <Field label="Date *"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required style={inputStyle} /></Field>
              <Field label="Type *">
                <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inputStyle}>
                  <option value="income">💚 Income (Money In)</option>
                  <option value="expense">🔴 Expense (Money Out)</option>
                </select>
              </Field>
            </div>
            <Field label="Description (What is this for?) *">
              <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} required placeholder="e.g. Red Velvet Cake sale, Staff salary..." style={inputStyle} />
            </Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <Field label="Amount (₦) *">
                <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} required min="0" step="0.01" placeholder="0.00" style={inputStyle} />
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inputStyle}>
                  <option value="">— Pick category —</option>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }}>
              <button type="button" onClick={()=>setShow(false)} style={{ padding:'11px 20px', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding:'11px 22px', background:'#0F2419', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>
                {saving ? '⏳ Saving...' : editing ? '✅ Update' : '💾 Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleting && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={() => setDel(null)}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:400, textAlign:'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:28 }}>🗑️</div>
            <h3 style={{ margin:'0 0 8px', fontWeight:800, color:'#0F2419', fontSize:18 }}>Delete Transaction?</h3>
            <p style={{ color:'#6B7280', fontSize:14, marginBottom:24 }}>
              <strong>{deleting.description}</strong> — {fmt.currency(deleting.amount)}
            </p>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button onClick={() => setDel(null)} style={{ padding:'11px 22px', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding:'11px 22px', background:'#DC2626', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}

const inputStyle = { width:'100%', padding:'11px 13px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, fontFamily:'DM Sans, sans-serif', boxSizing:'border-box', outline:'none' }

function Field({ label, children }) {
  return <div><label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>{label}</label>{children}</div>
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,.3)', animation:'scaleIn .25s ease-out' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'#0F2419' }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
