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
import { Ionicons } from '@expo/vector-icons';          // back button added
import { firebase_db, firebase_auth } from '@/firebase';
import { router } from 'expo-router';

/* types */
interface ChatRow {
  id: string;
  lastMessage: string;
  otherUid: string;
  otherName: string;
}

/* component */
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
    if (!me) return; // not signed in yet

    const q = query(
      collection(firebase_db, 'chats'),
      where('members', 'array-contains', me),
      orderBy('lastTime', 'desc'),
    );

    const unsubChats = onSnapshot(
      q,
      async snap => {
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
      },
      err => {
        if (err?.code === 'permission-denied') {
          setRows([]);
          return;
        }
        console.error('Chats listener error', err);
      }
    );

    return unsubChats;
  }, [me]);

  /* UI */
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
        <Ionicons name="chatbubbles-outline" size={48} color="#bbb" />
        <Text style={{ marginTop: 8, color: '#777' }}>No conversations yet</Text>
      </View>
    );
  }

  /* list */
  const renderItem = ({ item }: { item: ChatRow }) => {
    const initial =
      item.otherName?.[0]?.toUpperCase?.() || item.otherUid?.[0]?.toUpperCase?.() || '?';

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
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
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        {/* name and last message */}
        <View style={styles.textCol}>
          <Text style={styles.name} numberOfLines={1}>
            {item.otherName}
          </Text>
          <Text style={styles.msg} numberOfLines={1}>
            {item.lastMessage || ' '} {/* keep height even if empty */}
          </Text>
        </View>

        {/* chevron */}
        <Ionicons name="chevron-forward" size={18} color="#c5c5c5" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safe}>
      <FlatList
        data={rows}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 12 }}
        contentInsetAdjustmentBehavior="never"
      />
    </View>
  );
}

/* styles */
const AVATAR_SIZE = 42;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  /* rows */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
  },

  /* avatar */
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#007bff22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#007bff' },

  /* text column */
  textCol: { flex: 1 },
  name: { fontWeight: '600', fontSize: 16, marginBottom: 2, color: '#111' },
  msg: { color: '#555', fontSize: 14 },

  /* other */
  separator: { height: 1, backgroundColor: '#eee', marginLeft: AVATAR_SIZE + 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});









