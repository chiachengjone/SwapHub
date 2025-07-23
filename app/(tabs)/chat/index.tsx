import React, { useEffect, useState } from 'react';
import {
  FlatList,
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { firebase_db, firebase_auth } from '@/firebase';
import { router } from 'expo-router';

/* ────────── types ────────── */
interface ChatRow {
  id: string;
  lastMessage: string;
  otherUid: string;
  otherName: string;
}

/* ────────── component ────────── */
export default function ChatList() {
  const [me, setMe] = useState<string | null>(null);
  const [rows, setRows] = useState<ChatRow[]>([]);

  /* wait until Firebase restores the session */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(firebase_auth, user =>
      setMe(user ? user.uid : null),
    );
    return unsubAuth;
  }, []);

  /* listen for all chats that involve this user */
  useEffect(() => {
    if (!me) return; // not signed-in yet

    const q = query(
      collection(firebase_db, 'chats'),
      where('members', 'array-contains', me),
      orderBy('lastTime', 'desc'),
    );

    const unsubChats = onSnapshot(q, async snap => {
      /* if the query itself fails you will see the error in metro – most often it
         means the composite index listed at the end of this answer is missing */
      const tmp: ChatRow[] = await Promise.all(
        snap.docs.map(async d => {
          const data = d.data() as any;
          const otherUid = data.members.find((m: string) => m !== me);

          /* look up display name */
          let otherName = otherUid;
          try {
            const userSnap = await getDoc(doc(firebase_db, 'users', otherUid));
            if (userSnap.exists()) {
              otherName = (userSnap.data() as any).username ?? otherUid;
            }
          } catch (e) {
            console.warn('failed to load user profile', e);
          }

          return {
            id: d.id,
            lastMessage: data.lastMessage ?? '',
            otherUid,
            otherName,
          };
        }),
      );

      setRows(tmp);
    });

    return unsubChats;
  }, [me]);

  /* ────────── UI ────────── */
  if (!me) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No conversations yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={i => i.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            router.push({
              pathname: '/chat/[chatId]',
              params: {
                chatId: item.id,
                otherUid: item.otherUid,
                otherName: item.otherName,
              },
            })
          }>
          <Text style={styles.name}>{item.otherName}</Text>
          <Text style={styles.msg}>{item.lastMessage}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

/* ────────── styles ────────── */
const styles = StyleSheet.create({
  row: { padding: 16, borderBottomWidth: 1, borderColor: '#ddd' },
  name: { fontWeight: 'bold' },
  msg: { color: '#555' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});








