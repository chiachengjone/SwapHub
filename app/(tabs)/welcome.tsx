import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { firebase_db } from '@/firebase';

interface Listing {
  id: string;
  modName: string;
  currentSlot: string;
  desiredSlot: string;
  classType: string[];
  userId: string;
  username?: string;
}

const HomeScreen = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(firebase_db, 'listings'), (snapshot) => {
      const items: Listing[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Listing, 'id'>),
      }));
      setListings(items);
      setFilteredListings(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredListings(listings);
    } else {
      const lowered = searchTerm.toLowerCase();
      const filtered = listings.filter(
        (item) =>
          item.modName.toLowerCase().includes(lowered) ||
          item.classType.some((type) => type.toLowerCase().includes(lowered))  // ✅ match classType
      );
      setFilteredListings(filtered);
    }
  }, [searchTerm, listings]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#999" />
        <Text>Loading listings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by module or class type..."
        placeholderTextColor="#999"
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
      <Text style={styles.header}>All Listings</Text>
      <FlatList
        data={filteredListings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.itemTitle}>{item.modName}</Text>
            <Text>Current: {item.currentSlot}</Text>
            <Text>Desired: {item.desiredSlot}</Text>
            <Text>Class Types: {item.classType.join(', ')}</Text>
            <Text style={styles.poster}>Posted by: {item.username || 'Unknown'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No listings found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  listItem: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  itemTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  poster: { marginTop: 8, color: '#666' },
  searchInput: {
    height: 50, 
    fontSize: 16, 
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: '#f2f2f2',
    color: '#000',
  },
});

export default HomeScreen;
