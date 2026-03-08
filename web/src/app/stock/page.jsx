'use client'
import { useState, useEffect } from 'react'
import { getStockLevels, addProduct, updateProduct, deleteProduct, getBusinessId, fmt, supabase } from '@/lib/supabase'

export default function StockPage() {
  const [stock, setStock]     = useState([])
  const [loading, setLoad]    = useState(true)
  const [showAdd, setShow]    = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDel]    = useState(null)
  const [search, setSearch]   = useState('')
  const [form, setForm]       = useState({ name:'', unit_cost:0, unit_price:0, opening_stock:0, reorder_level:5 })
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState(null)

  async function load() {
    const { data } = await getStockLevels(); setStock(data||[]); setLoad(false)
  }
  useEffect(() => { load() }, [])

  function showToastMsg(msg, type='success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  function openAdd() {
    setForm({ name:'', unit_cost:0, unit_price:0, opening_stock:0, reorder_level:5 })
    setEditing(null); setShow(true)
  }

  function openEdit(s) {
    setForm({
      name: s.name||'', unit_cost: s.unit_cost||0, unit_price: s.unit_price||0,
      opening_stock: 0, reorder_level: s.reorder_level||5
    })
    setEditing(s); setShow(true)
  }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) {
        // Only update editable fields (not opening_stock which is immutable)
        await updateProduct(editing.product_id, {
          name: form.name, unit_cost: Number(form.unit_cost),
          unit_price: Number(form.unit_price), reorder_level: Number(form.reorder_level)
        })
        showToastMsg('Product updated ✅')
      } else {
        const bizId = await getBusinessId()
        await addProduct({ ...form, business_id: bizId })
        showToastMsg('Product added ✅')
      }
      setShow(false); load()
    } catch (err) { showToastMsg(err.message, 'error') }
    setSaving(false)
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteProduct(deleting.product_id)
    setDel(null); showToastMsg('Product deleted'); load()
  }

  const filtered = stock.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()))
  const totalValue = stock.reduce((sum,s) => sum + (Number(s.available_stock)*Number(s.unit_cost)), 0)
  const lowCount   = stock.filter(s => Number(s.available_stock) <= Number(s.reorder_level)).length
  const outCount   = stock.filter(s => Number(s.available_stock) <= 0).length

  const alertColor = (s) => {
    const qty = Number(s.available_stock), level = Number(s.reorder_level)
    if (qty <= 0)     return { bg:'#FEF2F2', color:'#DC2626', label:'🔴 OUT OF STOCK' }
    if (qty <= level) return { bg:'#FEF9C3', color:'#CA8A04', label:'🟡 LOW STOCK' }
    return                 { bg:'#F0FDF4', color:'#16A34A', label:'✅ OK' }
  }

  const inputS = { width:'100%', padding:'10px 12px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, fontFamily:'DM Sans, sans-serif', boxSizing:'border-box', outline:'none' }

  return (
    <div style={{ fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0F2419', margin:0 }}>📦 Stock & Inventory</h1>
          <p style={{ color:'#6B7280', marginTop:4 }}>Track your goods — wetin dey, wetin don finish</p>
        </div>
        <button onClick={openAdd} style={{ padding:'12px 22px', background:'#0F2419', border:'none', borderRadius:12, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14, fontFamily:'DM Sans' }}>
          + Add Product
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Products', value: stock.length,              color:'#0F2419', bg:'#F9FAFB' },
          { label:'Total Stock Value', value: fmt.currency(totalValue), color:'#2563EB', bg:'#EFF6FF' },
          { label:'Low Stock',      value: lowCount,                  color:'#CA8A04', bg:'#FEF9C3' },
          { label:'Out of Stock',   value: outCount,                  color:'#DC2626', bg:'#FEF2F2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background:bg, borderRadius:14, padding:'16px 20px', border:'1px solid rgba(0,0,0,.06)' }}>
            <p style={{ margin:0, fontSize:12, color:'#9CA3AF', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{label}</p>
            <p style={{ margin:'6px 0 0', fontSize:22, fontWeight:800, color }}>{value}</p>
          </div>
        ))}
      </div>

      <input placeholder="🔍 Search products..." value={search} onChange={e=>setSearch(e.target.value)}
        style={{ width:'100%', maxWidth:360, padding:'10px 14px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, marginBottom:16, fontFamily:'DM Sans', boxSizing:'border-box' }} />

      {/* Stock table */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#F9FAFB' }}>
              {['Product','Available','Total Sold','Unit Cost','Unit Price','Stock Value','Alert','Actions'].map(h=>(
                <th key={h} style={{ padding:'13px 16px', textAlign:'left', fontSize:11, color:'#6B7280', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid #E5E7EB' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>Loading...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={8} style={{ padding:60, textAlign:'center', color:'#9CA3AF' }}>No products yet. Add your first product.</td></tr>
            : filtered.map((s, i) => {
              const { bg, color, label } = alertColor(s)
              const stockValue = Number(s.available_stock) * Number(s.unit_cost)
              return (
                <tr key={s.product_id} style={{ background:i%2===0?'#fff':'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
                  <td style={{ padding:'13px 16px', fontSize:14, fontWeight:700, color:'#0F2419' }}>{s.name}</td>
                  <td style={{ padding:'13px 16px', fontSize:18, fontWeight:800, color: Number(s.available_stock)<=0?'#DC2626':Number(s.available_stock)<=Number(s.reorder_level)?'#CA8A04':'#0F2419' }}>{s.available_stock}</td>
                  <td style={{ padding:'13px 16px', fontSize:13, color:'#6B7280' }}>{s.total_sold}</td>
                  <td style={{ padding:'13px 16px', fontSize:13 }}>{fmt.currency(s.unit_cost)}</td>
                  <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:'#22C55E' }}>{fmt.currency(s.unit_price)}</td>
                  <td style={{ padding:'13px 16px', fontSize:13, fontWeight:700, color:'#2563EB' }}>{fmt.currency(stockValue)}</td>
                  <td style={{ padding:'13px 16px' }}>
                    <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:bg, color }}>{label}</span>
                  </td>
                  <td style={{ padding:'13px 16px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => openEdit(s)} style={{ padding:'5px 10px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:6, color:'#2563EB', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'DM Sans' }}>✏️</button>
                      <button onClick={() => setDel(s)} style={{ padding:'5px 10px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, color:'#DC2626', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'DM Sans' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Product Modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={()=>setShow(false)}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:520, animation:'scaleIn .25s ease-out' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'#0F2419' }}>{editing ? '✏️ Edit Product' : '+ Add Product'}</h2>
              <button onClick={()=>setShow(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>✕</button>
            </div>
            <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div><label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Product Name *</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required placeholder="e.g. Edge Control" style={inputS} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Cost Price (₦)</label>
                  <input type="number" value={form.unit_cost} onChange={e=>setForm(f=>({...f,unit_cost:Number(e.target.value)}))} min="0" style={inputS} />
                </div>
                <div><label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Selling Price (₦)</label>
                  <input type="number" value={form.unit_price} onChange={e=>setForm(f=>({...f,unit_price:Number(e.target.value)}))} min="0" style={inputS} />
                </div>
                {!editing && (
                  <div><label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Opening Stock (qty)</label>
                    <input type="number" value={form.opening_stock} onChange={e=>setForm(f=>({...f,opening_stock:Number(e.target.value)}))} min="0" style={inputS} />
                  </div>
                )}
                <div><label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Reorder Level (qty)</label>
                  <input type="number" value={form.reorder_level} onChange={e=>setForm(f=>({...f,reorder_level:Number(e.target.value)}))} min="0" style={inputS} />
                </div>
              </div>
              <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }}>
                <button type="button" onClick={()=>setShow(false)} style={{ padding:'11px 20px', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:'11px 24px', background:'#0F2419', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>
                  {saving ? 'Saving...' : editing ? '✅ Update' : '📦 Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleting && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={()=>setDel(null)}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:400, textAlign:'center' }} onClick={e=>e.stopPropagation()}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:28 }}>🗑️</div>
            <h3 style={{ margin:'0 0 8px', fontWeight:800, color:'#0F2419', fontSize:18 }}>Delete Product?</h3>
            <p style={{ color:'#6B7280', fontSize:14, marginBottom:24 }}>Are you sure you want to delete <strong>{deleting.name}</strong>?</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button onClick={()=>setDel(null)} style={{ padding:'11px 22px', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding:'11px 22px', background:'#DC2626', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
