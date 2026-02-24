import React, { useEffect, useState, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { firebase_auth, firebase_db } from '@/firebase';

type UserDoc = { username?: string };

const fetchDescriptionFromNUSMods = async (code: string): Promise<string> => {
  const moduleCode = code.trim().toUpperCase();
  if (!moduleCode) throw new Error('Please enter a module code.');
  const url = `https://api.nusmods.com/v2/2023-2024/modules/${moduleCode}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Module not found on NUSMods.');
  const data = await res.json();
  return data.description ?? 'No description available.';
};

interface Listing {
  id: string;
  modName: string;
  currentSlot: string;
  desiredSlot: string;
  classType: string[];
  userId: string;
  username?: string;
}

type HeaderProps = {
  modQuery: string;
  onChangeQuery: (v: string) => void;
  onSearch: () => void;
  aiLoading: boolean;
  aiAnswer: string;
  dbLoading: boolean;
};

const ListHeader = memo(
  ({
    modQuery,
    onChangeQuery,
    onSearch,
    aiLoading,
    aiAnswer,
    dbLoading,
  }: HeaderProps) => (
    <>
      <Text style={styles.sectionTitle}>NUSMods Search</Text>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Enter module code (e.g., CS1010)"
          placeholderTextColor="#888"
          value={modQuery}
          onChangeText={onChangeQuery}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {aiLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#007bff" />
          <Text style={styles.loadingText}>Fetching description...</Text>
        </View>
      )}

      {!aiLoading && aiAnswer !== '' && (
        <Text style={styles.answer}>{aiAnswer}</Text>
      )}

      <Text style={styles.sectionTitle}>My Listings</Text>
      {dbLoading && (
        <View style={styles.centeredLoader}>
          <ActivityIndicator size="small" color="#007bff" />
        </View>
      )}
    </>
  )
);
ListHeader.displayName = 'ListHeader';

type FooterProps = { onSignOut: () => void; username?: string };

const ListFooter: React.FC<FooterProps> = ({ onSignOut, username }) => (
  <>
    {username ? (
      <Text style={styles.loggedInText}>Logged in as “{username}”</Text>
    ) : null}
    <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut}>
      <Text style={styles.signOutBtnText}>Sign Out</Text>
    </TouchableOpacity>
  </>
);

const ProfileScreen = () => {
  // Firestore
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const auth = firebase_auth;
  const user = auth.currentUser;

  // Username 
  const [username, setUsername] = useState<string>();
  useEffect(() => {
    if (!user) return;
    const fetchName = async () => {
      const uDoc = await getDoc(doc(firebase_db, 'users', user.uid));
      if (uDoc.exists()) {
        setUsername((uDoc.data() as UserDoc).username ?? 'Unknown');
      }
    };
    fetchName();
  }, [user]);

  // NUSMods Search
  const [modQuery, setModQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(firebase_db, 'listings'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const items: Listing[] = [];
        for (const d of snap.docs) {
          const data = d.data() as Listing;
          let uName = data.username;
          if (!uName) {
            const uDoc = await getDoc(doc(firebase_db, 'users', data.userId));
            uName = uDoc.exists()
              ? ((uDoc.data() as UserDoc).username as string)
              : 'Unknown';
          }
          items.push({ ...data, id: d.id, username: uName });
        }
        setUserListings(items);
        setDbLoading(false);
      },
      (err) => {
        if (err?.code === 'permission-denied') {
          setUserListings([]);
          setDbLoading(false);
          return;
        }
        console.error('Profile listings listener error', err);
      }
    );
    return () => unsub();
  }, [user]);

  // Deletion of Listings
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(firebase_db, 'listings', id));
    } catch (e) {
      console.error('Delete error', e);
    }
  };

  // NUSMods Search
  const askNUSMods = async () => {
    if (!modQuery.trim()) return;
    try {
      setAiLoading(true);
      const desc = await fetchDescriptionFromNUSMods(modQuery);
      setAiAnswer(desc);
    } catch (err: any) {
      setAiAnswer(err.message ?? 'Something went wrong.');
    } finally {
      setAiLoading(false);
    }
  };

  // Rendering Listings
  const renderItem = ({ item }: { item: Listing }) => (
    <View style={styles.card}>
      <Text style={styles.modName} numberOfLines={1} ellipsizeMode="tail">
        {item.modName}
      </Text>
      <Text style={styles.listingDetail}>
        Current: {item.currentSlot} → Desired: {item.desiredSlot}
      </Text>
      <Text style={styles.listingDetail}>
        Type: {item.classType.join(', ')}
      </Text>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.id)}
      >
        <Text style={styles.deleteBtnText}>🗑 Delete</Text>
      </TouchableOpacity>
    </View>
  );

  // Signout
  const handleSignOut = async () => {
    router.replace('/signin');
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Sign out error', e);
    }
  };

  return (
    <FlatList
      data={userListings}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <ListHeader
          modQuery={modQuery}
          onChangeQuery={setModQuery}
          onSearch={askNUSMods}
          aiLoading={aiLoading}
          aiAnswer={aiAnswer}
          dbLoading={dbLoading}
        />
      }
      ListFooterComponent={
        <ListFooter onSignOut={handleSignOut} username={username} />
      }
      ListEmptyComponent={
        !dbLoading ? (
          <Text style={styles.emptyText}>No listings yet.</Text>
        ) : null
      }
    />
  );
};

// Styling
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    flexGrow: 1,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: '#007bff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 18,
  },
  answer: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 20,
    color: '#555',
    backgroundColor: '#eef6ff',
    padding: 12,
    borderRadius: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modName: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
    color: '#111',
  },
  listingDetail: {
    fontSize: 14,
    color: '#444',
  },
  deleteBtn: {
    marginTop: 8,
    backgroundColor: '#d9534f',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 15,
  },
  loggedInText: {
    alignSelf: 'center',
    marginBottom: 8,
    fontSize: 15,
    fontStyle: 'italic',
    color: '#666',
  },
  signOutBtn: {
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  signOutBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  centeredLoader: {
    alignItems: 'center',
    marginVertical: 10,
  },
  loadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  loadingText: {
    marginLeft: 8,
    color: '#555',
  },
});

export default ProfileScreen;










