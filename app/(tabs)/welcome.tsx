import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { firebase_db, firebase_auth } from '@/firebase';
import { getOrCreateChat } from '@/lib/chat';

interface Listing {
  id: string;
  modName: string;
  currentSlot: string;
  desiredSlot: string;
  classType: string[];
  userId: string;
  username?: string;
}

type ListingFromDB = Omit<Listing, 'id'>;

export default function HomeScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState('');

  /* live Firestore listener */
  useEffect(() => {
    const q = query(collection(firebase_db, 'listings'), orderBy('modName', 'asc'));

    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as ListingFromDB),
      }));
      setListings(data);
    });

    return unsub;
  }, []);

  /* render each card */
  const renderItem = ({ item }: { item: Listing }) => {
    if (filter && !item.modName.toLowerCase().includes(filter.toLowerCase())) return null;

    return (
      <View style={styles.card}>
        <Text style={styles.mod}>{item.modName}</Text>
        <Text style={styles.row}>Current slot: {item.currentSlot}</Text>
        <Text style={styles.row}>Desired slot: {item.desiredSlot}</Text>
        
        {/* Display username */}
        <Text style={styles.username}>Posted by: {item.username || 'Unknown user'}</Text>

        {/* CHAT BUTTON */}
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={async () => {
            if (!firebase_auth.currentUser) {
              alert('Please sign in to start a chat');
              return;
            }
            const chatId = await getOrCreateChat(item.userId);
            router.push(`/chat/${chatId}`);
          }}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          <Text style={styles.chatTxt}>Chat</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!listings.length) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search module name…"
        value={filter}
        onChangeText={setFilter}
        style={styles.search}
      />

      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        renderItem={renderItem}
      />
    </View>
  );
}

/* styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  search: {
    margin: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
  },

  card: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  mod: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  row: { color: '#555', marginBottom: 2 },
  
  username: { 
    color: '#888', 
    fontSize: 12, 
    fontStyle: 'italic',
    marginBottom: 8,
  },

  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007aff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',    
    marginTop: 8,
  },
  chatTxt: { color: '#fff', marginLeft: 6 },
});


