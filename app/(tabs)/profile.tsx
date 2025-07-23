import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { firebase_auth, firebase_db } from '@/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { router } from 'expo-router';

interface Listing {
  id: string;
  modName: string;
  currentSlot: string;
  desiredSlot: string;
  classType: string[];
  userId: string;
  username?: string; 
}

const ProfileScreen = () => {
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [userProfile, setUserProfile] = useState<{ username?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = firebase_auth.currentUser;
    if (!user) return;

    const fetchProfile = async () => {
      const docRef = doc(firebase_db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    };
    fetchProfile();

    const q = query(collection(firebase_db, 'listings'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listings: Listing[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Listing, 'id'>),
      }));
      setUserListings(listings);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(firebase_auth);
      router.replace('/signin');
    } catch (error: any) {
      alert('Error signing out: ' + error.message);
    }
  };

  const handleDelete = async (listingId: string) => {
    try {
      await deleteDoc(doc(firebase_db, 'listings', listingId));
    } catch (error: any) {
      alert('Failed to delete listing: ' + error.message);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#000" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>
      <Text style={styles.info}>Username: {userProfile?.username || 'N/A'}</Text>
      <Text style={styles.info}>Email: {userProfile?.email || 'N/A'}</Text>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.subheader}>Your Listings</Text>

      {userListings.length === 0 ? (
        <Text>No listings found.</Text>
      ) : (
        <FlatList
          data={userListings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.modName}>{item.modName}</Text>
              <Text>Current Slot: {item.currentSlot}</Text>
              <Text>Desired Slot: {item.desiredSlot}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subheader: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  info: { fontSize: 16, marginBottom: 4 },
  listItem: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 6, marginVertical: 6 },
  modName: { fontWeight: 'bold', fontSize: 18 },
  signOutButton: {
    backgroundColor: '#ff4444',
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: '#cc0000',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  deleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;