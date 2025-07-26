// app/(tabs)/explore.tsx

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firebase_db, firebase_auth } from '@/firebase';
import { router } from 'expo-router';
import { getOrCreateChat } from '@/lib/chat';

type Listing = {
  id: string;
  modName: string;
  currentSlot: string;
  desiredSlot: string;
  classType: string[];
  userId: string;
  username?: string;
};

export default function ExploreScreen() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [userResult, setUserResult] = useState<null | { uid: string; username: string }>(null);
  const [userNotFound, setUserNotFound] = useState(false);
  const [userListings, setUserListings] = useState<Listing[] | null>(null);
  const [listingsLoading, setListingsLoading] = useState(false);

  const handleSearch = async () => {
    Keyboard.dismiss();
    setUserResult(null);
    setUserListings(null);
    setUserNotFound(false);
    if (!search.trim()) return;
    setLoading(true);
    try {
      // Find user by username
      const usersRef = collection(firebase_db, 'users');
      const q = query(usersRef, where('username', '==', search.trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setUserNotFound(true);
        setLoading(false);
        return;
      }
      const userDoc = snap.docs[0];
      setUserResult({ uid: userDoc.id, username: userDoc.data().username });
      setLoading(false);

      setListingsLoading(true);
      // Fetch this user's listings
      const listingsRef = collection(firebase_db, 'listings');
      const qListings = query(listingsRef, where('userId', '==', userDoc.id));
      const listingsSnap = await getDocs(qListings);

      const items: Listing[] = listingsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          modName: data.modName,
          currentSlot: data.currentSlot,
          desiredSlot: data.desiredSlot,
          classType: Array.isArray(data.classType) ? data.classType : [],
          userId: data.userId,
          username: data.username || userDoc.data().username,
        };
      });
      setUserListings(items);
    } catch (e) {
      setUserNotFound(true);
    } finally {
      setLoading(false);
      setListingsLoading(false);
    }
  };

  // Always chats with that particular user, using your /lib/chat implementation!
  const handleChat = async (otherUid: string, otherName: string) => {
    const me = firebase_auth.currentUser;
    if (!me) {
      Alert.alert('Auth error', 'You must be signed in to start a chat.');
      return;
    }
    if (otherUid === me.uid) {
      Alert.alert('Cannot chat', 'You cannot chat with yourself!');
      return;
    }
    try {
      const chatId = await getOrCreateChat(otherUid);
      router.push({
        pathname: '/chat/[chatId]',
        params: {
          chatId,
          otherUid,
          otherName,
        },
      });
    } catch (err) {
      Alert.alert('Error', 'Could not open chat. Please try again.');
    }
  };

  const renderListing = ({ item }: { item: Listing }) => (
    <View style={styles.card}>
      <Text style={styles.modName}>{item.modName}</Text>
      <Text>
        Current: {item.currentSlot} → Desired: {item.desiredSlot}
      </Text>
      <Text>Type: {item.classType?.join(', ') || '—'}</Text>
      <Text style={styles.ownerText}>
        <Ionicons name="person-outline" size={14} color="#888" /> {item.username || 'Unknown'}
      </Text>
      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => handleChat(item.userId, item.username || 'User')}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />
        <Text style={styles.chatBtnText}> Chat</Text>
      </TouchableOpacity>
    </View>
  );

  const onSubmitEditing = () => handleSearch();

  return (
    <View style={styles.outer}>
      <Text style={styles.header}>Search User by Username</Text>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Enter username"
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={onSubmitEditing}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>
      {loading && <ActivityIndicator size="small" />}
      {userNotFound && <Text style={styles.emptyText}>No user found.</Text>}
      {userResult && (
        <View style={styles.profileSection}>
          <Text style={styles.profileName}>
            Viewing profile: <Text style={styles.username}>{userResult.username}</Text>
          </Text>
          <Text style={styles.sectionTitle}>Listings</Text>
          {listingsLoading ? (
            <ActivityIndicator size="small" />
          ) : userListings && userListings.length === 0 ? (
            <Text style={styles.emptyText}>This user has no listings.</Text>
          ) : (
            <FlatList
              data={userListings || []}
              keyExtractor={(item) => item.id}
              renderItem={renderListing}
              contentContainerStyle={{ paddingBottom: 32 }}
              style={{ flexGrow: 0 }}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, marginTop: 16, marginLeft: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  searchBtn: {
    backgroundColor: '#007bff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
  profileSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 18,
    marginTop: 20,
    marginHorizontal: 12,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  username: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  modName: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  ownerText: {
    color: '#888',
    marginTop: 4,
    fontSize: 13,
  },
  chatBtn: {
    marginTop: 8,
    backgroundColor: '#28a745',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
  },
  chatBtnText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 2,
  },
});
