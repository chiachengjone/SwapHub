import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { firebase_auth, firebase_db } from '@/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { router } from 'expo-router';

interface Listing {
  id: string;
  modName: string;
  currentSlot: string;
  desiredSlot: string;
  classType: string[];
  userId: string;
}

const ProfileScreen = () => {
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const user = firebase_auth.currentUser;

  useEffect(() => {
    if (!user) {
      router.replace('/signin');
      return;
    }

    const q = query(
      collection(firebase_db, 'listings'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Listing[];
      setUserListings(listings);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleDelete = async (listingId: string) => {
    try {
      await deleteDoc(doc(firebase_db, 'listings', listingId));
    } catch (error) {
      Alert.alert('Error', 'Failed to delete listing');
    }
  };

  const handleSignOut = async () => {
    await signOut(firebase_auth);
    router.replace('/'); // or your entry route
  };

  if (loading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Listings</Text>
      <FlatList
        data={userListings}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.listingCard}>
            <Text style={styles.listingTitle}>{item.modName}</Text>
            <Text>Current: {item.currentSlot}</Text>
            <Text>Desired: {item.desiredSlot}</Text>
            <Text>Types: {item.classType.join(', ')}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id)}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text>No listings created yet</Text>}
      />
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loader: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, alignSelf: 'center' },
  listingCard: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12
  },
  listingTitle: { fontSize: 16, fontWeight: 'bold' },
  deleteButton: {
    marginTop: 8,
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-end'
  },
  deleteText: { color: 'white' },
  signOutButton: {
    marginTop: 24,
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  signOutText: { color: 'white', fontWeight: 'bold' }
});

export default ProfileScreen;