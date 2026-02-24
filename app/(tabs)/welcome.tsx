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
  Modal,
  Pressable,
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

/* constants */
const CLASS_TYPE_OPTIONS = ['Lecture', 'Tutorial', 'Lab'];

/* types */
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
  const [filterType,  setFilterType]  = useState<string>('');
  const [showMenu,    setShowMenu]    = useState(false);
  const [loading,     setLoading]     = useState(true);

  const uid = firebase_auth.currentUser?.uid ?? '';

  /* stream listings */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(firebase_db, 'listings'),
      snap => {
        const list: Listing[] = [];
        snap.forEach(d =>
          list.push({ id: d.id, ...(d.data() as DocumentData) } as Listing),
        );
        setAllListings(list);
        setLoading(false);
      },
      err => {
        if (err?.code === 'permission-denied') {
          setAllListings([]);
          setLoading(false);
          return;
        }
        console.error('Listings listener error', err);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(firebase_db, 'listings'),
      where('userId', '==', uid),
    );
    const unsub = onSnapshot(
      q,
      snap => {
        const mine: Listing[] = [];
        snap.forEach(d =>
          mine.push({ id: d.id, ...(d.data() as DocumentData) } as Listing),
        );
        setMyListings(mine);
      },
      err => {
        if (err?.code === 'permission-denied') {
          setMyListings([]);
          return;
        }
        console.error('My listings listener error', err);
      }
    );
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

  /* build feed */
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

    let out = [...matches, ...rest];

    /* text search */
    out = out.filter(l =>
      l.modName.toLowerCase().includes(search.toLowerCase()),
    );

    /* class-type filter */
    if (filterType) out = out.filter(l => l.classType?.includes(filterType));

    return out;
  }, [
    allListings,
    myListings,
    slotMatch,
    sameClassType,
    uid,
    search,
    filterType,
  ]);

  /* open chat */
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

  /* UI */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* render dropdown menu items */
  const renderMenuItem = (label: string, value: string) => (
    <Pressable
      key={label}
      style={styles.menuItem}
      onPress={() => {
        setFilterType(value);
        setShowMenu(false);
      }}
    >
      <Text style={styles.menuText}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* TOP ROW: search bar + filter button */}
      <View style={styles.topRow}>
        {/* (search bar markup untouched) */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Search module..."
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* filter button */}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowMenu(true)}
        >
          <Text
            style={[
              styles.filterLabel,
              filterType ? { color: '#007aff', fontWeight: '600' } : undefined
            ]}
          >
            {filterType || 'Type'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={filterType ? '#007aff' : '#555'}
            style={{ marginLeft: 2 }}
          />
        </TouchableOpacity>
      </View>

      {/* drop-down modal */}
      <Modal
        animationType="fade"
        transparent
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowMenu(false)} />
        <View style={styles.menu}>
          {renderMenuItem('All', '')}
          {CLASS_TYPE_OPTIONS.map(opt => renderMenuItem(opt, opt))}
        </View>
      </Modal>

      {/* FEED */}
      <FlatList
        data={feed}
        keyExtractor={item => item.id}
        contentContainerStyle={feed.length === 0 && styles.center}
        contentInsetAdjustmentBehavior="never"
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

/* styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* top row */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
  },

  /* search bar (unchanged inside) */
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ececec',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  input: { flex: 1, marginLeft: 8, height: '100%', fontSize: 15 },

  /* filter button */
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 10,
    height: 34,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  filterLabel: { fontSize: 13, color: '#555' },

  /* modal drop-down */
  backdrop: {
    flex: 1,
    backgroundColor: '#0006',
  },
  menu: {
    position: 'absolute',
    top: 70,                   // search bar Y + some spacing
    right: 20,
    backgroundColor: '#fff',
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    minWidth: 130,
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 10 },
  menuText: { fontSize: 14, color: '#333' },

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







