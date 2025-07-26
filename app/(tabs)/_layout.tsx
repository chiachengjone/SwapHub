import React, { useState, useEffect } from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { firebase_auth } from '@/firebase'
import { listenUnseen } from '@/lib/chat'

export default function RootLayout() {
  const [badge, setBadge] = useState<number>()
  useEffect(() => {
    const uid = firebase_auth.currentUser?.uid
    if (!uid) return
    const unsub = listenUnseen(uid, count => setBadge(count || undefined))
    return unsub
  }, [])

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
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




