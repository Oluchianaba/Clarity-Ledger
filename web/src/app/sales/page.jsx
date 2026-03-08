'use client'
import { useState, useEffect } from 'react'
import { getInvoices, getInvoiceWithItems, getCustomers, getProducts, createInvoice, recordPayment, deleteInvoice, getBusinessId, fmt, supabase } from '@/lib/supabase'

export default function SalesPage() {
  const [invoices, setInvoices]   = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showNew, setShowNew]     = useState(false)
  const [payModal, setPayModal]   = useState(null)
  const [detail, setDetail]       = useState(null)
  const [deleting, setDeleting]   = useState(null)
  const [statusFilter, setStatusF]= useState('')
  const [search, setSearch]       = useState('')
  const [toast, setToast]         = useState(null)

  async function load() {
    setLoading(true)
    const [inv, cust, prod] = await Promise.all([
      getInvoices({ status: statusFilter || undefined }),
      getCustomers(),
      getProducts()
    ])
    setInvoices(inv.data||[]); setCustomers(cust.data||[]); setProducts(prod.data||[]); setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  function showToastMsg(msg, type='success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  async function openDetail(inv) {
    const result = await getInvoiceWithItems(inv.id)
    setDetail({ ...inv, ...result })
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteInvoice(deleting.id)
    setDeleting(null); showToastMsg('Invoice deleted'); load()
  }

  const filtered = invoices.filter(i =>
    !search || i.invoice_number?.includes(search) || i.customers?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalInvoiced = invoices.reduce((s,i)=>s+Number(i.total_amount),0)
  const totalCollected = invoices.reduce((s,i)=>s+Number(i.amount_paid),0)
  const totalAR = totalInvoiced - totalCollected
  const paidCount = invoices.filter(i=>i.status==='paid').length

  return (
    <div style={{ fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0F2419', margin:0 }}>🛒 Sales & Invoices</h1>
          <p style={{ color:'#6B7280', marginTop:4 }}>Create invoices, track payments, chase debtors</p>
        </div>
        <button onClick={()=>setShowNew(true)} style={{ padding:'12px 22px', background:'#0F2419', border:'none', borderRadius:12, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14, fontFamily:'DM Sans' }}>
          + New Invoice
        </button>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Invoiced',    value: fmt.currency(totalInvoiced), color:'#0F2419' },
          { label:'Total Collected',   value: fmt.currency(totalCollected), color:'#22C55E' },
          { label:'Outstanding (AR)',  value: fmt.currency(totalAR), color:'#F59E0B' },
          { label:'Paid Invoices',     value: paidCount, color:'#6B7280' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:'#fff', borderRadius:14, padding:'16px 20px', border:'1px solid #E5E7EB', boxShadow:'0 2px 8px rgba(0,0,0,.03)' }}>
            <p style={{ margin:0, fontSize:12, color:'#9CA3AF', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{label}</p>
            <p style={{ margin:'6px 0 0', fontSize:20, fontWeight:800, color }}>{value}</p>
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

      {/* Search */}
      <input placeholder="🔍 Search invoice # or customer..." value={search} onChange={e=>setSearch(e.target.value)}
        style={{ width:'100%', maxWidth:360, padding:'10px 14px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, marginBottom:16, fontFamily:'DM Sans', boxSizing:'border-box' }} />

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', overflow:'auto', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
          <thead>
            <tr style={{ background:'#F9FAFB' }}>
              {['Invoice #','Customer','Date','Due Date','Total','Paid','Balance','Status','Actions'].map(h => (
                <th key={h} style={{ padding:'13px 14px', textAlign:'left', fontSize:11, color:'#6B7280', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid #E5E7EB', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>Loading...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={9} style={{ padding:60, textAlign:'center', color:'#9CA3AF' }}>No invoices yet</td></tr>
            : filtered.map((inv, i) => {
              const balance = Number(inv.total_amount) - Number(inv.amount_paid)
              const overdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid'
              return (
                <tr key={inv.id} style={{ background:i%2===0?'#fff':'#FAFAFA', borderBottom:'1px solid #F3F4F6', cursor:'pointer' }} onClick={() => openDetail(inv)}>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:'#0F2419' }}>{inv.invoice_number}</td>
                  <td style={{ padding:'12px 14px', fontSize:13 }}>{inv.customers?.name || '—'}</td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:'#6B7280' }}>{fmt.date(inv.date)}</td>
                  <td style={{ padding:'12px 14px', fontSize:12, color: overdue?'#DC2626':'#6B7280', fontWeight: overdue?700:400 }}>{inv.due_date ? fmt.date(inv.due_date) : '—'}{overdue?' ⚠️':''}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600 }}>{fmt.currency(inv.total_amount)}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'#22C55E', fontWeight:600 }}>{fmt.currency(inv.amount_paid)}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color: balance>0?'#EF4444':'#22C55E', fontWeight:700 }}>{fmt.currency(balance)}</td>
                  <td style={{ padding:'12px 14px' }}><StatusBadge status={inv.status} /></td>
                  <td style={{ padding:'12px 14px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display:'flex', gap:6 }}>
                      {inv.status !== 'paid' && (
                        <button onClick={()=>setPayModal(inv)} style={{ padding:'4px 10px', background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:6, color:'#16A34A', fontWeight:600, cursor:'pointer', fontSize:12, fontFamily:'DM Sans' }}>💰 Pay</button>
                      )}
                      <button onClick={()=>setDeleting(inv)} style={{ padding:'4px 8px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, color:'#DC2626', cursor:'pointer', fontSize:12, fontFamily:'DM Sans' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* New Invoice Modal */}
      {showNew && <NewInvoiceModal customers={customers} products={products} onClose={()=>setShowNew(false)} onSaved={()=>{ setShowNew(false); showToastMsg('Invoice created ✅'); load() }} />}

      {/* Record Payment Modal */}
      {payModal && <PaymentModal invoice={payModal} onClose={()=>setPayModal(null)} onSaved={()=>{ setPayModal(null); showToastMsg('Payment recorded ✅'); load() }} />}

      {/* Invoice Detail Modal */}
      {detail && <InvoiceDetailModal detail={detail} onClose={()=>setDetail(null)} />}

      {/* Delete Confirmation */}
      {deleting && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={()=>setDeleting(null)}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:400, textAlign:'center' }} onClick={e=>e.stopPropagation()}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:28 }}>🗑️</div>
            <h3 style={{ margin:'0 0 8px', fontWeight:800, color:'#0F2419', fontSize:18 }}>Delete Invoice?</h3>
            <p style={{ color:'#6B7280', fontSize:14, marginBottom:24 }}>Delete <strong>{deleting.invoice_number}</strong>? This will also delete all line items and payments. This cannot be undone.</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button onClick={()=>setDeleting(null)} style={{ padding:'11px 22px', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Cancel</button>
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
  const map = { paid:['✅ PAID','#DCFCE7','#16A34A'], part_payment:['🟡 PART PAID','#FEF9C3','#CA8A04'], pending:['⏳ PENDING','#FEF2F2','#DC2626'] }
  const [label,bg,color] = map[status] || [status,'#F3F4F6','#6B7280']
  return <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:bg, color, whiteSpace:'nowrap' }}>{label}</span>
}

function InvoiceDetailModal({ detail, onClose }) {
  const { invoice, items } = detail
  const balance = Number(invoice?.total_amount || 0) - Number(invoice?.amount_paid || 0)
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:650, maxHeight:'90vh', overflowY:'auto', animation:'scaleIn .25s ease-out' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'#0F2419' }}>🧾 {invoice?.invoice_number}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF' }}>✕</button>
        </div>

        {/* Invoice info */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          <InfoRow label="Customer" value={invoice?.customers?.name || '—'} />
          <InfoRow label="Status" value={<StatusBadge status={invoice?.status} />} />
          <InfoRow label="Date" value={invoice?.date ? fmt.date(invoice.date) : '—'} />
          <InfoRow label="Due Date" value={invoice?.due_date ? fmt.date(invoice.due_date) : '—'} />
          <InfoRow label="Sales Person" value={invoice?.sales_person || '—'} />
          <InfoRow label="Customer Phone" value={invoice?.customers?.phone || '—'} />
        </div>

        {/* Line items */}
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>Line Items</h3>
        <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20 }}>
          <thead>
            <tr style={{ background:'#F9FAFB' }}>
              {['#','Product','Description','Qty','Unit Price','Total'].map(h => (
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:11, color:'#6B7280', fontWeight:700, borderBottom:'1px solid #E5E7EB' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items?.length > 0 ? items.map((item, i) => (
              <tr key={i} style={{ borderBottom:'1px solid #F3F4F6' }}>
                <td style={{ padding:'10px 12px', fontSize:13, color:'#9CA3AF' }}>{i+1}</td>
                <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600 }}>{item.products?.name || '—'}</td>
                <td style={{ padding:'10px 12px', fontSize:13 }}>{item.description}</td>
                <td style={{ padding:'10px 12px', fontSize:13 }}>{item.quantity}</td>
                <td style={{ padding:'10px 12px', fontSize:13 }}>{fmt.currency(item.unit_price)}</td>
                <td style={{ padding:'10px 12px', fontSize:13, fontWeight:700 }}>{fmt.currency(item.total)}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} style={{ padding:20, textAlign:'center', color:'#9CA3AF' }}>No line items</td></tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ background:'#F9FAFB', borderRadius:14, padding:'16px 20px' }}>
          {[
            ['Subtotal', fmt.currency(invoice?.subtotal || 0)],
            [`Discount (${invoice?.discount_pct || 0}%)`, `-${fmt.currency((invoice?.subtotal||0) * (invoice?.discount_pct||0)/100)}`],
            [`VAT (${invoice?.vat_pct || 0}%)`, fmt.currency(((invoice?.subtotal||0) - (invoice?.subtotal||0)*(invoice?.discount_pct||0)/100) * (invoice?.vat_pct||0)/100)],
          ].map(([l,v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:14, color:'#6B7280' }}><span>{l}</span><span>{v}</span></div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 4px', fontSize:18, fontWeight:800, color:'#0F2419', borderTop:'2px solid #E5E7EB', marginTop:8 }}>
            <span>TOTAL</span><span>{fmt.currency(invoice?.total_amount)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:14 }}>
            <span style={{ color:'#22C55E', fontWeight:600 }}>Paid</span><span style={{ color:'#22C55E', fontWeight:700 }}>{fmt.currency(invoice?.amount_paid)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:14 }}>
            <span style={{ color:'#EF4444', fontWeight:600 }}>Balance</span><span style={{ color:'#EF4444', fontWeight:700 }}>{fmt.currency(balance)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <span style={{ fontSize:12, color:'#9CA3AF', fontWeight:600, textTransform:'uppercase' }}>{label}</span>
      <div style={{ fontSize:14, color:'#0F2419', fontWeight:500, marginTop:2 }}>{value}</div>
    </div>
  )
}

function NewInvoiceModal({ customers, products, onClose, onSaved }) {
  const [custId, setCust]     = useState('')
  const [dueDate, setDue]     = useState('')
  const [salesPerson, setSP]  = useState('')
  const [vat, setVat]         = useState(7.5)
  const [discount, setDisc]   = useState(0)
  const [items, setItems]     = useState([{ product_id:'', description:'', quantity:1, unit_price:0 }])
  const [saving, setSaving]   = useState(false)

  const subtotal    = items.reduce((s,i)=>s+(Number(i.quantity)*Number(i.unit_price)),0)
  const discAmt     = subtotal * (discount/100)
  const vatAmt      = (subtotal - discAmt) * (vat/100)
  const total       = subtotal - discAmt + vatAmt

  function updateItem(idx, field, val) {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: val }
    if (field === 'product_id') {
      const p = products.find(pr=>pr.id===val)
      if (p) updated[idx] = { ...updated[idx], description: p.name, unit_price: p.unit_price }
    }
    setItems(updated)
  }

  async function save() {
    if (!custId) return alert('Please select a customer')
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const bizId = await getBusinessId()
      await createInvoice({
        business_id: bizId, customer_id: custId, due_date: dueDate||null,
        sales_person: salesPerson, vat_pct: vat, discount_pct: discount,
        subtotal, total_amount: total, created_by: user.id
      }, items.filter(i=>i.description))
      onSaved()
    } finally { setSaving(false) }
  }

  const inputS = { width:'100%', padding:'10px 12px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:13, fontFamily:'DM Sans', boxSizing:'border-box', outline:'none' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:700, maxHeight:'90vh', overflowY:'auto', animation:'scaleIn .25s ease-out' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'#0F2419' }}>🧾 New Invoice</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
          <div><label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Customer *</label>
            <select value={custId} onChange={e=>setCust(e.target.value)} style={inputS}>
              <option value="">— Select customer —</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Due Date</label>
            <input type="date" value={dueDate} onChange={e=>setDue(e.target.value)} style={inputS} />
          </div>
          <div><label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Sales Person</label>
            <input value={salesPerson} onChange={e=>setSP(e.target.value)} placeholder="e.g. RITA" style={inputS} />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1 }}><label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>VAT %</label>
              <input type="number" value={vat} onChange={e=>setVat(Number(e.target.value))} style={inputS} />
            </div>
            <div style={{ flex:1 }}><label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Discount %</label>
              <input type="number" value={discount} onChange={e=>setDisc(Number(e.target.value))} style={inputS} />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>Line Items</h3>
            <button onClick={()=>setItems([...items,{ product_id:'', description:'', quantity:1, unit_price:0 }])} style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:8, padding:'6px 12px', color:'#16A34A', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'DM Sans' }}>+ Add Row</button>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F9FAFB' }}>
                {['Product','Description','Qty','Unit Price','Total',''].map(h=>(
                  <th key={h} style={{ padding:'10px 10px', textAlign:'left', fontSize:11, color:'#6B7280', fontWeight:700, borderBottom:'1px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding:'8px 6px' }}>
                    <select value={item.product_id} onChange={e=>updateItem(idx,'product_id',e.target.value)} style={{ ...inputS, padding:'8px 10px' }}>
                      <option value="">Custom</option>
                      {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:'8px 6px' }}><input value={item.description} onChange={e=>updateItem(idx,'description',e.target.value)} placeholder="Description" style={{ ...inputS, padding:'8px 10px' }} /></td>
                  <td style={{ padding:'8px 6px' }}><input type="number" value={item.quantity} onChange={e=>updateItem(idx,'quantity',e.target.value)} min="0" style={{ ...inputS, padding:'8px 10px', width:70 }} /></td>
                  <td style={{ padding:'8px 6px' }}><input type="number" value={item.unit_price} onChange={e=>updateItem(idx,'unit_price',e.target.value)} min="0" style={{ ...inputS, padding:'8px 10px' }} /></td>
                  <td style={{ padding:'8px 6px', fontWeight:700, color:'#0F2419', fontSize:13 }}>{fmt.currency(Number(item.quantity)*Number(item.unit_price))}</td>
                  <td style={{ padding:'8px 6px' }}><button onClick={()=>setItems(items.filter((_,i)=>i!==idx))} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:16 }}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ background:'#F9FAFB', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
          {[['Subtotal', fmt.currency(subtotal)],['Discount', `-${fmt.currency(discAmt)}`],['VAT ('+vat+'%)', fmt.currency(vatAmt)]].map(([l,v])=>(
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:14, color:'#6B7280' }}><span>{l}</span><span>{v}</span></div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 0', fontSize:18, fontWeight:800, color:'#0F2419', borderTop:'2px solid #E5E7EB', marginTop:8 }}>
            <span>TOTAL</span><span>{fmt.currency(total)}</span>
          </div>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:12 }}>
          <button onClick={onClose} style={{ padding:'12px 20px', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding:'12px 24px', background:'#0F2419', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>
            {saving ? '⏳ Saving...' : '🧾 Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PaymentModal({ invoice, onClose, onSaved }) {
  const [amount, setAmount] = useState(Number(invoice.total_amount)-Number(invoice.amount_paid))
  const [method, setMethod] = useState('bank_transfer')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await recordPayment(invoice.id, amount, method)
    setSaving(false); onSaved()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:440, animation:'scaleIn .25s ease-out' }} onClick={e=>e.stopPropagation()}>
        <h2 style={{ margin:'0 0 20px', fontWeight:800, color:'#0F2419' }}>💰 Record Payment</h2>
        <p style={{ margin:'0 0 20px', color:'#6B7280', fontSize:14 }}>Invoice: <strong>{invoice.invoice_number}</strong> — Balance: <strong style={{ color:'#EF4444' }}>{fmt.currency(Number(invoice.total_amount)-Number(invoice.amount_paid))}</strong></p>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div><label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Amount Received (₦)</label>
            <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} min="0" style={{ width:'100%', padding:'12px 14px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:15, fontFamily:'DM Sans', boxSizing:'border-box' }} />
          </div>
          <div><label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Payment Method</label>
            <select value={method} onChange={e=>setMethod(e.target.value)} style={{ width:'100%', padding:'12px 14px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, fontFamily:'DM Sans' }}>
              <option value="bank_transfer">🏦 Bank Transfer</option>
              <option value="cash">💵 Cash</option>
              <option value="pos">💳 POS</option>
            </select>
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }}>
            <button onClick={onClose} style={{ padding:'11px 20px', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', background:'#fff', fontFamily:'DM Sans' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding:'11px 24px', background:'#22C55E', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>
              {saving ? '⏳...' : '✅ Confirm Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
