// mobile/src/screens/DashboardScreen.js
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions
} from 'react-native'
import { getDashboardKPIs, getMonthlyPL, fmt } from '../lib/supabase'

const W = Dimensions.get('window').width

export default function DashboardScreen() {
  const [kpis, setKPIs]       = useState(null)
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(false)

  async function load(isRefresh = false) {
    if (isRefresh) setRefresh(true)
    const [k, m] = await Promise.all([getDashboardKPIs(), getMonthlyPL(6)])
    setKPIs(k); setMonthly(m)
    setLoading(false); setRefresh(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#22C55E" />
      <Text style={{ color:'#6B7280', marginTop:12 }}>Loading your dashboard...</Text>
    </View>
  )

  const cards = [
    { label:'Total Income',    value: fmt.currency(kpis.totalIncome),   emoji:'💰', color:'#22C55E', bg:'#F0FDF4' },
    { label:'Total Expense',   value: fmt.currency(kpis.totalExpenses), emoji:'📤', color:'#EF4444', bg:'#FEF2F2' },
    { label:'Net Profit',      value: fmt.currency(kpis.netProfit),     emoji:'📈', color: kpis.netProfit>=0?'#22C55E':'#EF4444', bg:'#F8FAFC' },
    { label:'Unpaid Invoices', value: fmt.currency(kpis.totalAR),       emoji:'⏳', color:'#F59E0B', bg:'#FFFBEB' },
  ]

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.greeting}>Good day! 👋</Text>
        <Text style={s.title}>📊 Dashboard</Text>
        <Text style={s.subtitle}>{new Date().toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'short'})}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={()=>load(true)} tintColor="#22C55E"/>}
        contentContainerStyle={{ padding:16, paddingBottom:32 }}
      >
        {/* KPI Cards 2x2 grid */}
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:12, marginBottom:24 }}>
          {cards.map(({ label, value, emoji, color, bg }) => (
            <View key={label} style={{ width:(W-44)/2, background:bg, ...s.card, borderColor:color+'22' }}>
              <Text style={{ fontSize:28, marginBottom:6 }}>{emoji}</Text>
              <Text style={{ fontSize:11, color:'#9CA3AF', fontWeight:'700', marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</Text>
              <Text style={{ fontSize:18, fontWeight:'800', color }}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Net Profit KPI hero */}
        <View style={{ ...s.card, background:'#0F2419', borderColor:'#22C55E33', marginBottom:24 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <View>
              <Text style={{ color:'#86EFAC', fontSize:12, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.5 }}>Current Balance</Text>
              <Text style={{ color:'#fff', fontSize:28, fontWeight:'900', marginTop:4 }}>{fmt.currency(kpis.netProfit)}</Text>
              <Text style={{ color:'#86EFAC', fontSize:12, marginTop:2 }}>
                {kpis.netProfit >= 0 ? '📈 You are in profit!' : '⚠️ Expenses exceed income'}
              </Text>
            </View>
            <Text style={{ fontSize:48 }}>{kpis.netProfit >= 0 ? '🎯' : '⚠️'}</Text>
          </View>
        </View>

        {/* Monthly mini chart (text-based since no charting lib) */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>📅 Last 6 Months</Text>
          {monthly.map((m, i) => {
            const inc  = Number(m.total_income)
            const exp  = Number(m.total_expense)
            const net  = Number(m.net_profit)
            const maxVal = Math.max(...monthly.map(x => Math.max(Number(x.total_income), Number(x.total_expense))), 1)
            return (
              <View key={i} style={{ marginBottom:12 }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                  <Text style={{ fontSize:12, color:'#374151', fontWeight:'600' }}>{m.month_label}</Text>
                  <Text style={{ fontSize:12, fontWeight:'700', color: net>=0?'#22C55E':'#EF4444' }}>{fmt.currency(net)}</Text>
                </View>
                <View style={{ flexDirection:'row', gap:4 }}>
                  {/* Income bar */}
                  <View style={{ height:8, borderRadius:4, background:'#22C55E', width: `${(inc/maxVal)*100}%`, minWidth:4, flex:0 }}/>
                </View>
                <View style={{ flexDirection:'row', gap:4, marginTop:3 }}>
                  {/* Expense bar */}
                  <View style={{ height:8, borderRadius:4, background:'#EF4444', width: `${(exp/maxVal)*100}%`, minWidth:4, flex:0 }}/>
                </View>
              </View>
            )
          })}
          <View style={{ flexDirection:'row', gap:16, marginTop:8 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}><View style={{ width:12, height:8, borderRadius:4, background:'#22C55E'}}/><Text style={{ fontSize:11, color:'#6B7280' }}>Income</Text></View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}><View style={{ width:12, height:8, borderRadius:4, background:'#EF4444'}}/><Text style={{ fontSize:11, color:'#6B7280' }}>Expense</Text></View>
          </View>
        </View>

        {/* Low stock alerts */}
        {kpis.lowStock.length > 0 && (
          <View style={{ ...s.card, borderColor:'#FCA5A5', background:'#FEF2F2', marginTop:16 }}>
            <Text style={{ ...s.sectionTitle, color:'#DC2626' }}>🔴 Low Stock Alerts</Text>
            {kpis.lowStock.map(p => (
              <View key={p.product_id} style={{ flexDirection:'row', justifyContent:'space-between', paddingVertical:6, borderBottomWidth:1, borderBottomColor:'#FECACA' }}>
                <Text style={{ fontSize:13, fontWeight:'600', color:'#374151' }}>{p.name}</Text>
                <Text style={{ fontSize:13, color:'#DC2626', fontWeight:'700' }}>{p.available_stock} left</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:   { flex:1, background:'#F7F8FA' },
  center: { flex:1, alignItems:'center', justifyContent:'center', background:'#F7F8FA' },
  header: { background:'#0F2419', padding:20, paddingTop:56, paddingBottom:24 },
  greeting:{ color:'#86EFAC', fontSize:13, fontWeight:'600', marginBottom:2 },
  title:  { color:'#fff', fontSize:24, fontWeight:'900', letterSpacing:-0.5 },
  subtitle:{ color:'rgba(255,255,255,.5)', fontSize:13, marginTop:2 },
  card:   { background:'#fff', borderRadius:16, padding:16, borderWidth:1, borderColor:'#E5E7EB', shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.04, shadowRadius:8, elevation:2 },
  sectionTitle: { fontSize:15, fontWeight:'800', color:'#0F2419', marginBottom:14 },
})
