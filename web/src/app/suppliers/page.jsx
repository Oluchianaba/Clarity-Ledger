'use client'
import { useState, useEffect } from 'react'
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier, getBusinessId, fmt } from '@/lib/supabase'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [deleting, setDeleting]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({ name:'', contact_name:'', email:'', phone:'', address:'', bank_details:'' })
  const [toast, setToast]         = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await getSuppliers(search)
    setSuppliers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [search])

  function showToastMsg(msg, type='success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() {
    setForm({ name:'', contact_name:'', email:'', phone:'', address:'', bank_details:'' })
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(s) {
    setForm({
      name: s.name||'', contact_name: s.contact_name||'', email: s.email||'',
      phone: s.phone||'', address: s.address||'', bank_details: s.bank_details||''
    })
    setEditing(s)
    setShowForm(true)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await updateSupplier(editing.id, form)
        showToastMsg('Supplier updated ✅')
      } else {
        const bizId = await getBusinessId()
        await addSupplier({ ...form, business_id: bizId })
        showToastMsg('Supplier added ✅')
      }
      setShowForm(false)
      load()
    } catch (err) {
      showToastMsg(err.message, 'error')
    }
    setSaving(false)
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteSupplier(deleting.id)
    setDeleting(null)
    showToastMsg('Supplier deleted')
    load()
  }

  const withEmail = suppliers.filter(s => s.email).length
  const withBank  = suppliers.filter(s => s.bank_details).length

  return (
    <div style={{ fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0F2419', margin:0 }}>🏭 Suppliers</h1>
          <p style={{ color:'#6B7280', marginTop:4 }}>Manage your suppliers and vendors</p>
        </div>
        <button onClick={openAdd} style={{
          padding:'12px 22px', background:'#0F2419', border:'none', borderRadius:12,
          color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14, fontFamily:'DM Sans'
        }}>+ Add Supplier</button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Suppliers', value: suppliers.length, color:'#0F2419', bg:'#F9FAFB' },
          { label:'With Email',      value: withEmail,        color:'#2563EB', bg:'#EFF6FF' },
          { label:'With Bank Details',value: withBank,         color:'#22C55E', bg:'#F0FDF4' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background:bg, borderRadius:14, padding:'16px 20px', border:'1px solid rgba(0,0,0,.06)' }}>
            <p style={{ margin:0, fontSize:12, color:'#9CA3AF', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{label}</p>
            <p style={{ margin:'6px 0 0', fontSize:22, fontWeight:800, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <input placeholder="🔍 Search suppliers..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width:'100%', maxWidth:400, padding:'10px 14px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, marginBottom:16, fontFamily:'DM Sans', boxSizing:'border-box' }} />

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#F9FAFB' }}>
              {['Supplier Name','Contact Person','Email','Phone','Address','Bank Details','Actions'].map(h => (
                <th key={h} style={{ padding:'13px 16px', textAlign:'left', fontSize:11, color:'#6B7280', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid #E5E7EB' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>Loading...</td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:60, textAlign:'center', color:'#9CA3AF', fontSize:15 }}>
                No suppliers yet. Click <strong>+ Add Supplier</strong> to get started.
              </td></tr>
            ) : suppliers.map((s, i) => (
              <tr key={s.id} style={{ background: i%2===0?'#fff':'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
                <td style={{ padding:'13px 16px', fontSize:14, fontWeight:600, color:'#0F2419' }}>{s.name}</td>
                <td style={{ padding:'13px 16px', fontSize:13, color:'#6B7280' }}>{s.contact_name || '—'}</td>
                <td style={{ padding:'13px 16px', fontSize:13, color:'#6B7280' }}>{s.email || '—'}</td>
                <td style={{ padding:'13px 16px', fontSize:13, color:'#6B7280' }}>{s.phone || '—'}</td>
                <td style={{ padding:'13px 16px', fontSize:13, color:'#6B7280', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.address || '—'}</td>
                <td style={{ padding:'13px 16px', fontSize:12, color:'#9CA3AF', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.bank_details || '—'}</td>
                <td style={{ padding:'13px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => openEdit(s)} style={{ padding:'5px 10px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:6, color:'#2563EB', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'DM Sans' }}>✏️ Edit</button>
                    <button onClick={() => setDeleting(s)} style={{ padding:'5px 10px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, color:'#DC2626', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'DM Sans' }}>🗑️</button>
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
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:560, animation:'scaleIn .25s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'#0F2419' }}>{editing ? '✏️ Edit Supplier' : '+ Add Supplier'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF' }}>✕</button>
            </div>
            <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <FormField label="Supplier Name *">
                  <input required value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. ABC Supplies" style={inputStyle} />
                </FormField>
                <FormField label="Contact Person">
                  <input value={form.contact_name} onChange={e => setForm(f=>({...f,contact_name:e.target.value}))} placeholder="e.g. Mr. Ade" style={inputStyle} />
                </FormField>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <FormField label="Email">
                  <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="supplier@example.com" style={inputStyle} />
                </FormField>
                <FormField label="Phone">
                  <input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="08012345678" style={inputStyle} />
                </FormField>
              </div>
              <FormField label="Address">
                <input value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} placeholder="Street address" style={inputStyle} />
              </FormField>
              <FormField label="Bank Details">
                <textarea value={form.bank_details} onChange={e => setForm(f=>({...f,bank_details:e.target.value}))} placeholder="Bank name, account number, account name..." rows={3} style={{ ...inputStyle, resize:'vertical' }} />
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
            <h3 style={{ margin:'0 0 8px', fontWeight:800, color:'#0F2419', fontSize:18 }}>Delete Supplier?</h3>
            <p style={{ color:'#6B7280', fontSize:14, marginBottom:24 }}>Are you sure you want to delete <strong>{deleting.name}</strong>? This cannot be undone.</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button onClick={() => setDeleting(null)} style={{ padding:'11px 22px', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Cancel</button>
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

function FormField({ label, children }) {
  return <div><label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>{label}</label>{children}</div>
}
