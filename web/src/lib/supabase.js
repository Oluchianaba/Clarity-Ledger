// lib/supabase.js — Clarity Ledger Supabase Client
// Full CRUD for all entities + helpers

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── AUTH ─────────────────────────────────────────────────────
export const auth = {
  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getUser: () => supabase.auth.getUser(),
  onAuthChange: (cb) => supabase.auth.onAuthStateChange(cb),
}

// ── HELPER: Get current user's business_id ────────────────────
export async function getBusinessId() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('business_members').select('business_id')
    .eq('user_id', user.id).single()
  return data?.business_id
}

// ── BUSINESS SETUP ────────────────────────────────────────────
export async function createBusiness(userId, data) {
  const { data: biz, error: e1 } = await supabase
    .from('businesses').insert({ owner_id: userId, ...data }).select().single()
  if (e1) throw e1
  const { error: e2 } = await supabase
    .from('business_members').insert({ business_id: biz.id, user_id: userId, role: 'owner', email: data.email, name: data.name })
  if (e2) throw e2
  return biz
}

export async function getMyBusiness() {
  const { data } = await supabase.from('businesses')
    .select('*').eq('owner_id', (await supabase.auth.getUser()).data.user?.id).single()
  return data
}

// ── DASHBOARD KPIs ────────────────────────────────────────────
export async function getDashboardKPIs() {
  const [income, expenses, ar, ap, stock] = await Promise.all([
    supabase.from('transactions').select('amount').eq('type', 'income'),
    supabase.from('transactions').select('amount').eq('type', 'expense'),
    supabase.from('invoices').select('total_amount,amount_paid').neq('status', 'paid'),
    supabase.from('purchases').select('total_cost,amount_paid').neq('status', 'paid'),
    supabase.from('stock_levels').select('available_stock,unit_cost,reorder_level,name'),
  ])
  const totalIncome = income.data?.reduce((s, r) => s + Number(r.amount), 0) || 0
  const totalExpenses = expenses.data?.reduce((s, r) => s + Number(r.amount), 0) || 0
  const totalAR = ar.data?.reduce((s, r) => s + Number(r.total_amount) - Number(r.amount_paid), 0) || 0
  const totalAP = ap.data?.reduce((s, r) => s + Number(r.total_cost) - Number(r.amount_paid), 0) || 0
  const lowStock = stock.data?.filter(p => Number(p.available_stock) <= Number(p.reorder_level)) || []
  return { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses, totalAR, totalAP, lowStock }
}

export async function getMonthlyPL(months = 12) {
  const { data } = await supabase.from('monthly_pl').select('*')
    .order('month', { ascending: false }).limit(months)
  return data?.reverse() || []
}

// ── TRANSACTIONS ──────────────────────────────────────────────
export async function getTransactions({ page = 0, limit = 50, type, category, search } = {}) {
  let q = supabase.from('transactions').select('*', { count: 'exact' })
    .order('date', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)
  if (type) q = q.eq('type', type)
  if (category) q = q.eq('category', category)
  if (search) q = q.ilike('description', `%${search}%`)
  return q
}

export async function addTransaction(data) {
  return supabase.from('transactions').insert(data).select().single()
}

export async function updateTransaction(id, data) {
  return supabase.from('transactions').update(data).eq('id', id).select().single()
}

export async function deleteTransaction(id) {
  return supabase.from('transactions').delete().eq('id', id)
}

// ── INVOICES / SALES ──────────────────────────────────────────
export async function getInvoices({ status, search } = {}) {
  let q = supabase.from('invoices')
    .select('*, customers(name, phone)')
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  if (search) q = q.ilike('invoice_number', `%${search}%`)
  return q
}

export async function getInvoiceWithItems(invoiceId) {
  const [inv, items] = await Promise.all([
    supabase.from('invoices').select('*, customers(name, phone, email)').eq('id', invoiceId).single(),
    supabase.from('invoice_items').select('*, products(name)').eq('invoice_id', invoiceId),
  ])
  return { invoice: inv.data, items: items.data || [] }
}

export async function createInvoice(invoiceData, items) {
  const { data: inv, error } = await supabase
    .from('invoices').insert({ ...invoiceData, invoice_number: '' }).select().single()
  if (error) throw error
  if (items?.length) {
    await supabase.from('invoice_items')
      .insert(items.map(i => ({ ...i, invoice_id: inv.id })))
  }
  return inv
}

export async function updateInvoice(id, data) {
  return supabase.from('invoices').update(data).eq('id', id).select().single()
}

export async function deleteInvoice(id) {
  // invoice_items and invoice_payments cascade
  return supabase.from('invoices').delete().eq('id', id)
}

export async function recordPayment(invoiceId, amount, method = 'bank_transfer') {
  return supabase.from('invoice_payments').insert({ invoice_id: invoiceId, amount, method }).select().single()
}

export async function getInvoicePayments(invoiceId) {
  return supabase.from('invoice_payments').select('*').eq('invoice_id', invoiceId).order('date', { ascending: false })
}

// ── STOCK ─────────────────────────────────────────────────────
export async function getStockLevels() {
  return supabase.from('stock_levels').select('*').order('name')
}

export async function getProducts() {
  return supabase.from('products').select('*').order('name')
}

export async function addProduct(data) {
  return supabase.from('products').insert(data).select().single()
}

export async function updateProduct(id, data) {
  return supabase.from('products').update(data).eq('id', id).select().single()
}

export async function deleteProduct(id) {
  return supabase.from('products').delete().eq('id', id)
}

// ── CUSTOMERS ─────────────────────────────────────────────────
export async function getCustomers(search) {
  let q = supabase.from('customers').select('*').order('name')
  if (search) q = q.ilike('name', `%${search}%`)
  return q
}

export async function addCustomer(data) {
  return supabase.from('customers').insert(data).select().single()
}

export async function updateCustomer(id, data) {
  return supabase.from('customers').update(data).eq('id', id).select().single()
}

export async function deleteCustomer(id) {
  return supabase.from('customers').delete().eq('id', id)
}

// ── SUPPLIERS ─────────────────────────────────────────────────
export async function getSuppliers(search) {
  let q = supabase.from('suppliers').select('*').order('name')
  if (search) q = q.ilike('name', `%${search}%`)
  return q
}

export async function addSupplier(data) {
  return supabase.from('suppliers').insert(data).select().single()
}

export async function updateSupplier(id, data) {
  return supabase.from('suppliers').update(data).eq('id', id).select().single()
}

export async function deleteSupplier(id) {
  return supabase.from('suppliers').delete().eq('id', id)
}

// ── PURCHASES ─────────────────────────────────────────────────
export async function getPurchases({ status, search } = {}) {
  let q = supabase.from('purchases')
    .select('*, suppliers(name), products(name)')
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  return q
}

export async function addPurchase(data) {
  return supabase.from('purchases').insert(data).select().single()
}

export async function updatePurchase(id, data) {
  return supabase.from('purchases').update(data).eq('id', id).select().single()
}

export async function deletePurchase(id) {
  return supabase.from('purchases').delete().eq('id', id)
}

export async function recordPurchasePayment(purchaseId, amount) {
  // Get current purchase
  const { data: purchase } = await supabase.from('purchases').select('total_cost, amount_paid').eq('id', purchaseId).single()
  if (!purchase) throw new Error('Purchase not found')
  const newPaid = Number(purchase.amount_paid) + amount
  const totalCost = Number(purchase.total_cost)
  const status = newPaid >= totalCost ? 'paid' : newPaid > 0 ? 'part_payment' : 'pending'
  return supabase.from('purchases').update({ amount_paid: newPaid, status }).eq('id', purchaseId).select().single()
}

// ── ANALYTICS ─────────────────────────────────────────────────
export async function getCategoryBreakdown() {
  const { data } = await supabase.from('transactions').select('type, category, amount')
  if (!data) return { income: [], expense: [] }
  const grouped = {}
  data.forEach(t => {
    const key = `${t.type}:${t.category || 'Uncategorized'}`
    grouped[key] = (grouped[key] || 0) + Number(t.amount)
  })
  const income = [], expense = []
  Object.entries(grouped).forEach(([key, value]) => {
    const [type, category] = key.split(':')
    const entry = { category, amount: value }
    if (type === 'income') income.push(entry)
    else expense.push(entry)
  })
  return {
    income: income.sort((a, b) => b.amount - a.amount),
    expense: expense.sort((a, b) => b.amount - a.amount),
  }
}

export async function getTopProducts(limit = 5) {
  const { data } = await supabase.from('invoice_items')
    .select('product_id, quantity, unit_price, products(name)')
  if (!data) return []
  const grouped = {}
  data.forEach(item => {
    const name = item.products?.name || 'Unknown'
    if (!grouped[name]) grouped[name] = { name, totalQty: 0, totalRevenue: 0 }
    grouped[name].totalQty += Number(item.quantity)
    grouped[name].totalRevenue += Number(item.quantity) * Number(item.unit_price)
  })
  return Object.values(grouped).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, limit)
}

export async function getTopCustomers(limit = 5) {
  const { data } = await supabase.from('invoices')
    .select('total_amount, customers(name)')
  if (!data) return []
  const grouped = {}
  data.forEach(inv => {
    const name = inv.customers?.name || 'Unknown'
    if (!grouped[name]) grouped[name] = { name, totalSpent: 0, invoiceCount: 0 }
    grouped[name].totalSpent += Number(inv.total_amount)
    grouped[name].invoiceCount += 1
  })
  return Object.values(grouped).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, limit)
}

// ── FORMAT HELPERS ────────────────────────────────────────────
export const fmt = {
  currency: (n) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`,
  date: (d) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }),
  status: (s) => ({ paid: '✅ PAID', part_payment: '🟡 PART PAID', pending: '⏳ PENDING' }[s] || s),
}
