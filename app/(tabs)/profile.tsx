// app/(tabs)/profile.tsx
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

/* ------------------------------------------------------------------ */
/* ----------------------------- NEW -------------------------------- */
type UserDoc = { username?: string };        // loose typing
/* ------------------------------------------------------------------ */

/* ---------------------------- HELPERS ------------------------------ */
const fetchDescriptionFromNUSMods = async (code: string): Promise<string> => {
  const moduleCode = code.trim().toUpperCase();
  if (!moduleCode) throw new Error('Please enter a module code.');

  const url = `https://api.nusmods.com/v2/2023-2024/modules/${moduleCode}.json`;
  const res = await fetch(url);

  if (!res.ok) throw new Error('Module not found on NUSMods.');
  const data = await res.json();
  return data.description ?? 'No description available.';
};

/* ----------------------------- TYPES ------------------------------ */
interface Listing {
  id: string;
  modName: string;
  currentSlot: string;
  desiredSlot: string;
  classType: string[];
  userId: string;
  username?: string;
}

/* --------------------- HEADER & FOOTER COMPONENTS ------------------ */
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
      {/* NUSMods search bar */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Enter module code (e.g., CS2030)…"
          value={modQuery}
          onChangeText={onChangeQuery}
          returnKeyType="search"
          onSubmitEditing={onSearch}
        />
        <Pressable style={styles.searchBtn} onPress={onSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>
      </View>

      {aiLoading && <ActivityIndicator style={{ marginTop: 12 }} />}
      {!aiLoading && aiAnswer !== '' && (
        <Text style={styles.answer}>{aiAnswer}</Text>
      )}

      <Text style={styles.sectionTitle}>My Listings</Text>
      {dbLoading && (
        <ActivityIndicator size="large" style={{ marginTop: 12 }} />
      )}
    </>
  )
);
ListHeader.displayName = 'ListHeader';

/* ---------- FOOTER (now also shows username) ---------- */
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

/* --------------------------- COMPONENT ----------------------------- */
const ProfileScreen = () => {
  /* ---------- Firestore data ---------- */
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  const auth = firebase_auth;
  const user = auth.currentUser;

  /* ---------- username ---------- */
  const [username, setUsername] = useState<string | undefined>();

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

  /* ---------- NUSMods search ---------- */
  const [modQuery, setModQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  /* Fetch / listen for this user’s listings */
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(firebase_db, 'listings'),
      where('userId', '==', user.uid)
    );

    const unsub = onSnapshot(q, async snap => {
      const items: Listing[] = [];

      for (const d of snap.docs) {
        const data = d.data() as Listing;

        // fetch username if not already present
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
    });

    return () => unsub();
  }, [user]);

  /* Delete listing */
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(firebase_db, 'listings', id));
    } catch (e) {
      console.error('Delete error', e);
    }
  };

  /* Ask NUSMods */
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

  /* Render each listing */
  const renderItem = ({ item }: { item: Listing }) => (
    <View style={styles.card}>
      <Text style={styles.modName}>{item.modName}</Text>
      <Text>
        Current: {item.currentSlot} → Desired: {item.desiredSlot}
      </Text>
      <Text>Type: {item.classType.join(', ')}</Text>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.id)}
      >
        <Text style={styles.deleteBtnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  /* Sign-out */
  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/signin');
  };

  /* ----------------------------- JSX ------------------------------- */
  return (
    <FlatList
      data={userListings}
      keyExtractor={item => item.id}
      renderItem={renderItem}
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

/* ----------------------------- STYLES ------------------------------ */
const styles = StyleSheet.create({
  container: {
    padding: 16,
  },

  /* Search bar */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
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
  answer: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 20,
  },

  /* Listings */
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  modName: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  deleteBtn: {
    marginTop: 8,
    backgroundColor: '#d9534f',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
  },

  /* Logged-in text */
  loggedInText: {
    alignSelf: 'center',
    marginBottom: 8,
    fontSize: 15,
    fontStyle: 'italic',
  },

  /* Sign-out */
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
});

export default ProfileScreen;










