import React, { useState, useEffect } from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { firebase_auth } from '@/firebase'
import { listenUnseen } from '@/lib/chat'
import { onAuthStateChanged } from 'firebase/auth'
import { ActivityIndicator, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function RootLayout() {
  const [badge, setBadge] = useState<number>()
  const [authReady, setAuthReady] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    const unsub = onAuthStateChanged(firebase_auth, user => {
      setIsAuthed(!!user)
      setAuthReady(true)
      if (!user) router.replace('/signin')
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!isAuthed) return
    const uid = firebase_auth.currentUser?.uid
    if (!uid) return
    const unsub = listenUnseen(uid, count => setBadge(count || undefined))
    return unsub
  }, [isAuthed])

  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!isAuthed) return null

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 56 + Math.min(insets.bottom, 8),
          paddingTop: 6,
          paddingBottom: 6,
          backgroundColor: '#fff',
          borderTopColor: '#ddd',
          borderTopWidth: 1,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, any> = {
            welcome: 'home',
            explore: 'search',
            post: 'add-circle',
            chat: 'chatbubbles',
            profile: 'person',
          }
          return <Ionicons name={icons[route.name]} size={size} color={color} />
        },
      })}
    >
      <Tabs.Screen name="welcome" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="post" options={{ title: 'Post' }} />
      {/* only one "chat" tab here */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chats',
          tabBarBadge: badge,
          lazy: false,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}




