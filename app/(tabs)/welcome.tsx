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
}

const HomeScreen = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firebase_db, 'listings'), (snapshot) => {
      const data: Listing[] = snapshot.docs.map(doc => {
        const docData = doc.data() as Omit<Listing, 'id'>;
        return {
          ...docData,
          id: doc.id
        };
      });
      setListings(data);
      setFilteredListings(data); // Initialize filtered list with all data
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      setFilteredListings(listings);
      return;
    }

    const filtered = listings.filter(listing =>
      listing.modName.toLowerCase().includes(lowerQuery) ||
      listing.classType.some(type => type.toLowerCase().includes(lowerQuery))
    );

    setFilteredListings(filtered);
  };

  const renderItem = ({ item }: { item: Listing }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.modName}</Text>
      <Text>Current Slot: {item.currentSlot}</Text>
      <Text>Desired Slot: {item.desiredSlot}</Text>
      <Text>Class Types: {item.classType.join(', ')}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search by mod name or class type..."
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={handleSearch}
        clearButtonMode="while-editing"
      />

      <FlatList
        data={filteredListings}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? "No matching listings found" : "No listings available"}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default HomeScreen;

