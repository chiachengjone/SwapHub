import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { firebase_auth } from '@/firebase';
import { listenUnseen } from '@/lib/chat';

export default function TabLayout() {
  const [badge, setBadge] = useState<number | undefined>();

  useEffect(() => {
    const uid = firebase_auth.currentUser?.uid;
    if (!uid) return;
    const unsub = listenUnseen(uid, c => setBadge(c || undefined));
    return unsub;
  }, []);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            welcome: 'home',
            explore: 'search',
            post: 'add-circle',
            profile: 'person',
            chat: 'chatbubbles',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="welcome" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="post"    options={{ title: 'Post' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat', tabBarBadge: badge, headerShown: false }}
      />
    </Tabs>
  );
}




