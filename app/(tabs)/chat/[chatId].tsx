import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  CollectionReference,
  Timestamp,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { firebase_db, firebase_auth } from '@/firebase';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ChatMessage = {
  id: string;
  text: string;
  createdAt: Date;
  senderId: string;
};

async function sendMessage(
  chatId: string,
  meUid: string,
  text: string,
  msgsRef: CollectionReference,
) {
  await addDoc(msgsRef, {
    text,
    createdAt: serverTimestamp(),
    senderId: meUid,
    seenBy: [meUid],
  });
  await updateDoc(doc(firebase_db, 'chats', chatId), {
    lastMessage: text,
    lastTime: serverTimestamp(),
  });
}

export default function ChatRoom() {
  const { chatId, otherName } = useLocalSearchParams<{
    chatId: string;
    otherName?: string;
  }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const me = firebase_auth.currentUser!;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const msgsRef = collection(firebase_db, `messages/${chatId}/items`);

  useEffect(() => {
    navigation.setOptions({ title: otherName ?? 'Chat' });
  }, [navigation, otherName]);

  useEffect(() => {
    const q = query(msgsRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      snap => {
        const mapped = snap.docs.map(d => {
          const data = d.data();
          const ts = data.createdAt as Timestamp | null | undefined;
          const createdAt =
            ts && typeof ts.toDate === 'function' ? ts.toDate() : new Date();
          return {
            id: d.id,
            text: data.text,
            createdAt,
            senderId: data.senderId,
          } as ChatMessage;
        });
        setMessages(mapped);

        snap.docs.forEach(d => {
          const data = d.data();
          if (!data.seenBy?.includes(me.uid)) {
            updateDoc(d.ref, { seenBy: [...(data.seenBy || []), me.uid] });
          }
        });
      },
      err => {
        if (err?.code === 'permission-denied') {
          setMessages([]);
          return;
        }
        console.error('Messages listener error', err);
      },
    );
    return unsub;
  }, [msgsRef, me.uid]);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendMessage(chatId as string, me.uid, text, msgsRef);
  }, [chatId, input, me.uid, msgsRef]);

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.senderId === me.uid;
    return (
      <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
        <View style={[styles.bubble, mine ? styles.rightBubble : styles.leftBubble]}>
          <Text style={mine ? styles.rightBubbleText : styles.leftBubbleText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        inverted
        contentContainerStyle={styles.listContent}
      />

      <View style={[styles.inputToolbar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity onPress={onSend} disabled={!input.trim()} style={styles.sendBtn}>
          <Ionicons name="send" size={22} color={input.trim() ? '#007bff' : '#bbb'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafe' },
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rightBubble: { backgroundColor: '#007bff' },
  leftBubble: { backgroundColor: '#e5e5ea' },
  rightBubbleText: { color: '#fff' },
  leftBubbleText: { color: '#000' },
  inputToolbar: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
});
