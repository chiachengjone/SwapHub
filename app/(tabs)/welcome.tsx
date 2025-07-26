/* app/(tabs)/welcome.tsx */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  onSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { firebase_db, firebase_auth } from '@/firebase';
import { router } from 'expo-router';
import { getOrCreateChat } from '@/lib/chat';

/* ---------- types ---------- */
interface Listing {
  id: string;
  modName: string;
  currentSlot: string;
  desiredSlot: string;
  classType?: string[];
  userId: string;
  username?: string;
  isMatch?: boolean;
}

export default function WelcomeScreen() {
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [myListings,  setMyListings]  = useState<Listing[]>([]);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);

  const uid = firebase_auth.currentUser?.uid ?? '';

  /* ---- stream listings (unchanged) ---- */
  useEffect(() => {
    const unsub = onSnapshot(collection(firebase_db, 'listings'), snap => {
      const list: Listing[] = [];
      snap.forEach(d =>
        list.push({ id: d.id, ...(d.data() as DocumentData) } as Listing),
      );
      setAllListings(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(firebase_db, 'listings'),
      where('userId', '==', uid),
    );
    const unsub = onSnapshot(q, snap => {
      const mine: Listing[] = [];
      snap.forEach(d =>
        mine.push({ id: d.id, ...(d.data() as DocumentData) } as Listing),
      );
      setMyListings(mine);
    });
    return unsub;
  }, [uid]);

  /* helpers (unchanged) */
  const slotMatch = useCallback(
    (wanted: string | string[], slot: string) => {
      if (Array.isArray(wanted)) return wanted.includes(slot.trim());
      return wanted.split(/[, ]+/).includes(slot.trim());
    },
    [],
  );
  const sameClassType = useCallback(
    (a?: string[], b?: string[]) =>
      !!a?.length && !!b?.length && a.some(t => b.includes(t)),
    [],
  );

  /* build feed (unchanged) */
  const feed = useMemo(() => {
    const others = allListings.filter(l => l.userId !== uid);

    const matches: Listing[] = [];
    const rest:    Listing[] = [];

    others.forEach(listing => {
      const perfect = myListings.some(my =>
        listing.modName === my.modName &&
        slotMatch(listing.desiredSlot, my.currentSlot) &&
        slotMatch(my.desiredSlot,   listing.currentSlot) &&
        sameClassType(my.classType, listing.classType),
      );
      (perfect ? matches : rest).push({ ...listing, isMatch: perfect });
    });

    return [...matches, ...rest].filter(l =>
      l.modName.toLowerCase().includes(search.toLowerCase()),
    );
  }, [allListings, myListings, slotMatch, sameClassType, uid, search]);

  /* open chat (unchanged) */
  const handleChatPress = async (otherUid: string, otherName?: string) => {
    try {
      const chatId = await getOrCreateChat(otherUid);
      router.push({
        pathname: '/chat/[chatId]',
        params: { chatId, otherUid, otherName: otherName ?? otherUid },
      });
    } catch (e) {
      console.warn('failed to open chat', e);
      Alert.alert('Oops', 'Could not open chat. Please try again.');
    }
  };

  /* ---------- UI ---------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ==== SEARCH BAR (unchanged) ==== */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="Search module..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={feed}
        keyExtractor={item => item.id}
        contentContainerStyle={feed.length === 0 && styles.center}
        ListEmptyComponent={<Text>No listings found.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, item.isMatch && styles.matchCard]}>
            <View style={styles.row}>
              {/* LEFT: details */}
              <View style={styles.details}>
                <Text style={styles.mod}>{item.modName}</Text>

                <View style={styles.typeRow}>
                  <Ionicons
                    name="bookmark-outline"
                    size={14}
                    color="#555"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.typeText}>
                    {item.classType?.join(', ') ?? 'N/A'}
                  </Text>
                </View>

                <Text style={styles.slot}>{`Current Slot: ${item.currentSlot}`}</Text>
                <Text style={styles.slot}>{`Wants: ${item.desiredSlot}`}</Text>
                <Text style={styles.by}>{`by ${item.username ?? 'unknown'}`}</Text>
              </View>

              {/* RIGHT: chat button (icon + text) */}
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => handleChatPress(item.userId, item.username)}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color="#007aff"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.chatLabel}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* search bar */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ececec',
    margin: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  input: { flex: 1, marginLeft: 8, height: '100%', fontSize: 15 },

  /* listing card */
  card: {
    backgroundColor: '#fff',
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 7,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  matchCard: {
    backgroundColor: '#e9ffe9',
    borderWidth: 1,
    borderColor: '#34c759',
  },
  row: { flexDirection: 'row' },

  /* left column */
  details: { flex: 1 },
  mod: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  typeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  typeText: { fontSize: 14, color: '#555' },
  slot: { fontSize: 14, marginBottom: 2 },
  by:   { marginTop: 6, fontSize: 12, color: '#777', fontStyle: 'italic' },

  /* chat button */
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    marginLeft: 10,
    alignSelf: 'flex-start',
  },
  chatLabel: { color: '#007aff', fontSize: 14, fontWeight: '600' },
});





