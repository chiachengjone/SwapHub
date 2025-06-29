import React from 'react';
import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name='welcome'
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name='home-outline' size={22} color={color} />
          )
        }}
      />

      <Tabs.Screen name='explore' options={{
        title: 'Explore',
        tabBarIcon: ({ color }) => (
          <Ionicons name='search-outline' size={22} color={color} />
        )
      }} />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post',
          tabBarLabel: 'Post',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'create' : 'create-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen name='cart' options={{
        title: 'Cart',
        tabBarBadge: 3,
        tabBarIcon: ({ color }) => (
          <Ionicons name='cart-outline' size={22} color={color} />
        )
      }} />
      <Tabs.Screen name='profile' options={{
        title: 'Profile',
        tabBarIcon: ({ color }) => (
          <Ionicons name='person-outline' size={22} color={color} />
        )
      }} />
    </Tabs>
  );
}