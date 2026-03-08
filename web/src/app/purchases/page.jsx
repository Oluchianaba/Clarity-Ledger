'use client'
import { useState, useEffect } from 'react'
import { getPurchases, addPurchase, deletePurchase, recordPurchasePayment, getSuppliers, getProducts, getBusinessId, fmt, supabase } from '@/lib/supabase'

export default function PurchasesPage() {
  const [purchases, setPurchases]   = useState([])
  const [suppliers, setSuppliers]   = useState([])
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showNew, setShowNew]       = useState(false)
  const [payModal, setPayModal]     = useState(null)
  const [deleting, setDeleting]     = useState(null)
  const [statusFilter, setStatusF]  = useState('')
  const [toast, setToast]           = useState(null)

  async function load() {
    setLoading(true)
    const [p, s, pr] = await Promise.all([
      getPurchases({ status: statusFilter || undefined }),
      getSuppliers(),
      getProducts()
    ])
    setPurchases(p.data || [])
    setSuppliers(s.data || [])
    setProducts(pr.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  function showToastMsg(msg, type='success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const totalCost = purchases.reduce((s,p) => s + Number(p.total_cost || 0), 0)
  const totalPaid = purchases.reduce((s,p) => s + Number(p.amount_paid || 0), 0)
  const outstanding = totalCost - totalPaid
  const pendingCount = purchases.filter(p => p.status !== 'paid').length

  async function confirmDelete() {
    if (!deleting) return
    await deletePurchase(deleting.id)
    setDeleting(null)
    showToastMsg('Purchase deleted')
    load()
  }

  return (
    <div style={{ fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0F2419', margin:0 }}>📥 Purchases</h1>
          <p style={{ color:'#6B7280', marginTop:4 }}>Track purchases from suppliers and payments owed</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          padding:'12px 22px', background:'#0F2419', border:'none', borderRadius:12,
          color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14, fontFamily:'DM Sans'
        }}>+ New Purchase</button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Purchases', value: purchases.length, color:'#0F2419', bg:'#F9FAFB' },
          { label:'Total Cost',      value: fmt.currency(totalCost), color:'#2563EB', bg:'#EFF6FF' },
          { label:'Total Paid',      value: fmt.currency(totalPaid), color:'#22C55E', bg:'#F0FDF4' },
          { label:'Outstanding (AP)', value: fmt.currency(outstanding), color:'#EF4444', bg:'#FEF2F2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background:bg, borderRadius:14, padding:'16px 20px', border:'1px solid rgba(0,0,0,.06)' }}>
            <p style={{ margin:0, fontSize:12, color:'#9CA3AF', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{label}</p>
            <p style={{ margin:'6px 0 0', fontSize:22, fontWeight:800, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[
          { label:'All', value:'' },
          { label:'⏳ Pending', value:'pending' },
          { label:'🟡 Part Paid', value:'part_payment' },
          { label:'✅ Paid', value:'paid' },
        ].map(tab => (
          <button key={tab.value} onClick={() => setStatusF(tab.value)} style={{
            padding:'8px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
            background: statusFilter === tab.value ? '#0F2419' : '#F3F4F6',
            color: statusFilter === tab.value ? '#86EFAC' : '#6B7280',
            border: 'none', fontFamily:'DM Sans'
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', overflow:'auto', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
          <thead>
            <tr style={{ background:'#F9FAFB' }}>
              {['Date','Supplier','Product','Qty','Unit Cost','Total','Paid','Balance','Status','Due Date','Actions'].map(h => (
                <th key={h} style={{ padding:'13px 12px', textAlign:'left', fontSize:11, color:'#6B7280', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid #E5E7EB', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>Loading...</td></tr>
            ) : purchases.length === 0 ? (
              <tr><td colSpan={11} style={{ padding:60, textAlign:'center', color:'#9CA3AF', fontSize:15 }}>
                No purchases yet. Click <strong>+ New Purchase</strong> to record one.
              </td></tr>
            ) : purchases.map((p, i) => {
              const balance = Number(p.total_cost || 0) - Number(p.amount_paid || 0)
              const overdue = p.due_date && new Date(p.due_date) < new Date() && p.status !== 'paid'
              return (
                <tr key={p.id} style={{ background: i%2===0?'#fff':'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
                  <td style={{ padding:'12px', fontSize:12, color:'#6B7280' }}>{fmt.date(p.date)}</td>
                  <td style={{ padding:'12px', fontSize:13, fontWeight:600, color:'#0F2419' }}>{p.suppliers?.name || '—'}</td>
                  <td style={{ padding:'12px', fontSize:13 }}>{p.products?.name || '—'}</td>
                  <td style={{ padding:'12px', fontSize:13, fontWeight:600 }}>{p.quantity}</td>
                  <td style={{ padding:'12px', fontSize:13 }}>{fmt.currency(p.unit_cost)}</td>
                  <td style={{ padding:'12px', fontSize:13, fontWeight:700, color:'#0F2419' }}>{fmt.currency(p.total_cost)}</td>
                  <td style={{ padding:'12px', fontSize:13, color:'#22C55E', fontWeight:600 }}>{fmt.currency(p.amount_paid)}</td>
                  <td style={{ padding:'12px', fontSize:13, color: balance>0?'#EF4444':'#22C55E', fontWeight:700 }}>{fmt.currency(balance)}</td>
                  <td style={{ padding:'12px' }}>
                    <StatusBadge status={p.status} />
                  </td>
                  <td style={{ padding:'12px', fontSize:12, color: overdue?'#DC2626':'#6B7280', fontWeight: overdue?700:400 }}>
                    {p.due_date ? fmt.date(p.due_date) : '—'}{overdue ? ' ⚠️' : ''}
                  </td>
                  <td style={{ padding:'12px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      {p.status !== 'paid' && (
                        <button onClick={() => setPayModal(p)} style={{ padding:'4px 10px', background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:6, color:'#16A34A', fontWeight:600, cursor:'pointer', fontSize:12, fontFamily:'DM Sans' }}>💰 Pay</button>
                      )}
                      <button onClick={() => setDeleting(p)} style={{ padding:'4px 8px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, color:'#DC2626', cursor:'pointer', fontSize:12, fontFamily:'DM Sans' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* New Purchase Modal */}
      {showNew && <NewPurchaseModal suppliers={suppliers} products={products} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); showToastMsg('Purchase recorded ✅'); load() }} />}

      {/* Payment Modal */}
      {payModal && <PurchasePaymentModal purchase={payModal} onClose={() => setPayModal(null)} onSaved={() => { setPayModal(null); showToastMsg('Payment recorded ✅'); load() }} />}

      {/* Delete Confirmation */}
      {deleting && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={() => setDeleting(null)}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:400, textAlign:'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:28 }}>🗑️</div>
            <h3 style={{ margin:'0 0 8px', fontWeight:800, color:'#0F2419', fontSize:18 }}>Delete Purchase?</h3>
            <p style={{ color:'#6B7280', fontSize:14, marginBottom:24 }}>This will delete the purchase record. This cannot be undone.</p>
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

function StatusBadge({ status }) {
  const map = {
    paid: ['✅ PAID','#DCFCE7','#16A34A'],
    part_payment: ['🟡 PART PAID','#FEF9C3','#CA8A04'],
    pending: ['⏳ PENDING','#FEF2F2','#DC2626'],
  }
  const [label,bg,color] = map[status] || [status,'#F3F4F6','#6B7280']
  return <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:bg, color, whiteSpace:'nowrap' }}>{label}</span>
}

function NewPurchaseModal({ suppliers, products, onClose, onSaved }) {
  const [form, setForm] = useState({
    supplier_id:'', product_id:'', quantity:1, unit_cost:0, due_date:''
  })
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    if (!form.supplier_id) return alert('Please select a supplier')
    if (!form.product_id)  return alert('Please select a product')
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const bizId = await getBusinessId()
      await addPurchase({
        business_id: bizId,
        supplier_id: form.supplier_id,
        product_id: form.product_id,
        quantity: Number(form.quantity),
        unit_cost: Number(form.unit_cost),
        due_date: form.due_date || null,
        created_by: user.id,
      })
      onSaved()
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  function selectProduct(pid) {
    setForm(f => ({ ...f, product_id: pid }))
    const p = products.find(pr => pr.id === pid)
    if (p) setForm(f => ({ ...f, unit_cost: p.unit_cost || 0 }))
  }

  const total = Number(form.quantity) * Number(form.unit_cost)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:520, animation:'scaleIn .25s ease-out' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'#0F2419' }}>📥 New Purchase</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF' }}>✕</button>
        </div>
        <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FormField label="Supplier *">
              <select required value={form.supplier_id} onChange={e => setForm(f=>({...f,supplier_id:e.target.value}))} style={inputStyle}>
                <option value="">— Select supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
            <FormField label="Product *">
              <select required value={form.product_id} onChange={e => selectProduct(e.target.value)} style={inputStyle}>
                <option value="">— Select product —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <FormField label="Quantity *">
              <input type="number" required value={form.quantity} onChange={e => setForm(f=>({...f,quantity:e.target.value}))} min="1" style={inputStyle} />
            </FormField>
            <FormField label="Unit Cost (₦) *">
              <input type="number" required value={form.unit_cost} onChange={e => setForm(f=>({...f,unit_cost:e.target.value}))} min="0" step="0.01" style={inputStyle} />
            </FormField>
            <FormField label="Due Date">
              <input type="date" value={form.due_date} onChange={e => setForm(f=>({...f,due_date:e.target.value}))} style={inputStyle} />
            </FormField>
          </div>

          <div style={{ background:'#F9FAFB', borderRadius:12, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:14, color:'#6B7280', fontWeight:600 }}>Total Cost:</span>
            <span style={{ fontSize:20, fontWeight:800, color:'#0F2419' }}>{fmt.currency(total)}</span>
          </div>

          <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" onClick={onClose} style={{ padding:'11px 20px', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding:'11px 22px', background:'#0F2419', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>
              {saving ? '⏳ Saving...' : '📥 Record Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PurchasePaymentModal({ purchase, onClose, onSaved }) {
  const balance = Number(purchase.total_cost || 0) - Number(purchase.amount_paid || 0)
  const [amount, setAmount] = useState(balance)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (amount <= 0) return alert('Enter a valid amount')
    setSaving(true)
    try {
      await recordPurchasePayment(purchase.id, Number(amount))
      onSaved()
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:440 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin:'0 0 20px', fontWeight:800, color:'#0F2419' }}>💰 Record Payment</h2>
        <p style={{ margin:'0 0 8px', color:'#6B7280', fontSize:14 }}>
          Supplier: <strong>{purchase.suppliers?.name}</strong> — Product: <strong>{purchase.products?.name}</strong>
        </p>
        <p style={{ margin:'0 0 20px', color:'#6B7280', fontSize:14 }}>
          Total: <strong>{fmt.currency(purchase.total_cost)}</strong> — Balance: <strong style={{ color:'#EF4444' }}>{fmt.currency(balance)}</strong>
        </p>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Amount to Pay (₦)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0" max={balance} step="0.01"
            style={{ width:'100%', padding:'12px 14px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:15, fontFamily:'DM Sans', boxSizing:'border-box' }} />
        </div>
        <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'11px 20px', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding:'11px 24px', background:'#22C55E', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>
            {saving ? '⏳...' : '✅ Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle = { width:'100%', padding:'11px 13px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, fontFamily:'DM Sans, sans-serif', boxSizing:'border-box', outline:'none' }

function FormField({ label, children }) {
  return <div><label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>{label}</label>{children}</div>
}
