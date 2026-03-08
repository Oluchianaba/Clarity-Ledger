'use client'
import { useState, useEffect } from 'react'
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getBusinessId, fmt, supabase } from '@/lib/supabase'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [deleting, setDeleting]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({ name:'', email:'', phone:'', address:'', notes:'' })
  const [toast, setToast]         = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await getCustomers(search)
    setCustomers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [search])

  function showToast(msg, type='success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() {
    setForm({ name:'', email:'', phone:'', address:'', notes:'' })
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(c) {
    setForm({ name: c.name||'', email: c.email||'', phone: c.phone||'', address: c.address||'', notes: c.notes||'' })
    setEditing(c)
    setShowForm(true)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await updateCustomer(editing.id, form)
        showToast('Customer updated ✅')
      } else {
        const bizId = await getBusinessId()
        await addCustomer({ ...form, business_id: bizId })
        showToast('Customer added ✅')
      }
      setShowForm(false)
      load()
    } catch (err) {
      showToast(err.message, 'error')
    }
    setSaving(false)
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteCustomer(deleting.id)
    setDeleting(null)
    showToast('Customer deleted')
    load()
  }

  const withEmail = customers.filter(c => c.email).length
  const withPhone = customers.filter(c => c.phone).length
  const recent = customers.filter(c => {
    const d = new Date(c.created_at)
    return (Date.now() - d.getTime()) < 30*24*60*60*1000
  }).length

  return (
    <div style={{ fontFamily:'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0F2419', margin:0 }}>👥 Customers</h1>
          <p style={{ color:'#6B7280', marginTop:4 }}>Manage your customer database</p>
        </div>
        <button onClick={openAdd} style={{
          padding:'12px 22px', background:'#0F2419', border:'none', borderRadius:12,
          color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', gap:8,
          fontFamily:'DM Sans, sans-serif'
        }}>+ Add Customer</button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Customers', value: customers.length, color:'#0F2419', bg:'#F9FAFB' },
          { label:'With Email',      value: withEmail,        color:'#2563EB', bg:'#EFF6FF' },
          { label:'With Phone',      value: withPhone,        color:'#22C55E', bg:'#F0FDF4' },
          { label:'Added (30 days)', value: recent,           color:'#8B5CF6', bg:'#F5F3FF' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background:bg, borderRadius:14, padding:'16px 20px', border:'1px solid rgba(0,0,0,.06)' }}>
            <p style={{ margin:0, fontSize:12, color:'#9CA3AF', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{label}</p>
            <p style={{ margin:'6px 0 0', fontSize:22, fontWeight:800, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <input placeholder="🔍 Search customers by name..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width:'100%', maxWidth:400, padding:'10px 14px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, marginBottom:16, fontFamily:'DM Sans, sans-serif', boxSizing:'border-box' }} />

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#F9FAFB' }}>
              {['Name','Email','Phone','Address','Notes','Date Added','Actions'].map(h => (
                <th key={h} style={{ padding:'13px 16px', textAlign:'left', fontSize:11, color:'#6B7280', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid #E5E7EB' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:60, textAlign:'center', color:'#9CA3AF', fontSize:15 }}>
                No customers yet. Click <strong>+ Add Customer</strong> to add your first one.
              </td></tr>
            ) : customers.map((c, i) => (
              <tr key={c.id} style={{ background: i%2===0?'#fff':'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
                <td style={{ padding:'13px 16px', fontSize:14, fontWeight:600, color:'#0F2419' }}>{c.name}</td>
                <td style={{ padding:'13px 16px', fontSize:13, color:'#6B7280' }}>{c.email || '—'}</td>
                <td style={{ padding:'13px 16px', fontSize:13, color:'#6B7280' }}>{c.phone || '—'}</td>
                <td style={{ padding:'13px 16px', fontSize:13, color:'#6B7280', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.address || '—'}</td>
                <td style={{ padding:'13px 16px', fontSize:12, color:'#9CA3AF', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.notes || '—'}</td>
                <td style={{ padding:'13px 16px', fontSize:12, color:'#9CA3AF' }}>{fmt.date(c.created_at)}</td>
                <td style={{ padding:'13px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => openEdit(c)} style={{ padding:'5px 10px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:6, color:'#2563EB', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'DM Sans' }}>✏️ Edit</button>
                    <button onClick={() => setDeleting(c)} style={{ padding:'5px 10px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, color:'#DC2626', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'DM Sans' }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }} onClick={() => setShowForm(false)}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:520, animation:'scaleIn .25s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'#0F2419' }}>{editing ? '✏️ Edit Customer' : '+ Add Customer'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF' }}>✕</button>
            </div>
            <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <FormField label="Customer Name *">
                <input required value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. John Doe" style={inputStyle} />
              </FormField>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <FormField label="Email">
                  <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="customer@example.com" style={inputStyle} />
                </FormField>
                <FormField label="Phone">
                  <input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="08012345678" style={inputStyle} />
                </FormField>
              </div>
              <FormField label="Address">
                <input value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} placeholder="Street address" style={inputStyle} />
              </FormField>
              <FormField label="Notes">
                <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Any notes about this customer..." rows={3}
                  style={{ ...inputStyle, resize:'vertical' }} />
              </FormField>
              <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding:'11px 20px', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:'11px 22px', background:'#0F2419', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>
                  {saving ? '⏳ Saving...' : editing ? '✅ Update' : '💾 Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleting && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={() => setDeleting(null)}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:400, textAlign:'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:28 }}>🗑️</div>
            <h3 style={{ margin:'0 0 8px', fontWeight:800, color:'#0F2419', fontSize:18 }}>Delete Customer?</h3>
            <p style={{ color:'#6B7280', fontSize:14, marginBottom:24 }}>Are you sure you want to delete <strong>{deleting.name}</strong>? This cannot be undone.</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button onClick={() => setDeleting(null)} style={{ padding:'11px 22px', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding:'11px 22px', background:'#DC2626', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  )
}

const inputStyle = { width:'100%', padding:'11px 13px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, fontFamily:'DM Sans, sans-serif', boxSizing:'border-box', outline:'none' }

function FormField({ label, children }) {
  return <div><label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>{label}</label>{children}</div>
}
