import React from 'react'
import { Stack } from 'expo-router'

export default function ChatLayout() {
  return (
    <Stack>
      {/* this is the root of the chat tab */}
      <Stack.Screen
        name="index"
        options={{
          title: 'Chats',
        }}
      />
      {/* this is your room screen; gets pushed on top */}
      <Stack.Screen
        name="[chatId]"
        options={({ route }) => ({
          // read the otherName param for your header
          title: (route.params as any).otherName ?? 'Chat',
          // show the back button
          headerBackTitleVisible: false,
        })}
      />
    </Stack>
  )
}
