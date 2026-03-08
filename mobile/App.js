// mobile/App.js — React Native Expo entry point
// Install: npx create-expo-app clarity-ledger-mobile
// Then copy this file + src/ folder

import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { useState, useEffect } from 'react'
import { supabase } from './src/lib/supabase'

// Screens
import LoginScreen     from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import TransactionsScreen from './src/screens/TransactionsScreen'
import SalesScreen     from './src/screens/SalesScreen'
import StockScreen     from './src/screens/StockScreen'
import ContactsScreen  from './src/screens/ContactsScreen'

const Tab   = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor:'#0F2419', borderTopColor:'rgba(255,255,255,.1)', height:64, paddingBottom:8 },
      tabBarActiveTintColor:  '#22C55E',
      tabBarInactiveTintColor:'#6B7280',
      tabBarLabelStyle: { fontSize:11, fontWeight:'600' },
    }}>
      <Tab.Screen name="Dashboard"    component={DashboardScreen}    options={{ tabBarLabel:'Dashboard', tabBarIcon:({color})=><TabIcon emoji="📊" color={color}/> }}/>
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ tabBarLabel:'Money',     tabBarIcon:({color})=><TabIcon emoji="💰" color={color}/> }}/>
      <Tab.Screen name="Sales"        component={SalesScreen}        options={{ tabBarLabel:'Sales',     tabBarIcon:({color})=><TabIcon emoji="🛒" color={color}/> }}/>
      <Tab.Screen name="Stock"        component={StockScreen}        options={{ tabBarLabel:'Stock',     tabBarIcon:({color})=><TabIcon emoji="📦" color={color}/> }}/>
      <Tab.Screen name="Contacts"     component={ContactsScreen}     options={{ tabBarLabel:'People',    tabBarIcon:({color})=><TabIcon emoji="👥" color={color}/> }}/>
    </Tab.Navigator>
  )
}

function TabIcon({ emoji, color }) {
  const { Text } = require('react-native')
  return <Text style={{ fontSize:22, opacity: color==='#22C55E' ? 1 : 0.5 }}>{emoji}</Text>
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined=loading, null=logged out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    supabase.auth.onAuthStateChange((_ev, s) => setSession(s))
  }, [])

  if (session === undefined) return null // splash/loading

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown:false }}>
        {!session
          ? <Stack.Screen name="Login" component={LoginScreen} />
          : <Stack.Screen name="Main"  component={MainTabs} />
        }
      </Stack.Navigator>
    </NavigationContainer>
  )
}
