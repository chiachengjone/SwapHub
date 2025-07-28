import React, { useEffect, useState, useCallback } from 'react';
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, where, getDocs, onSnapshot,
} from 'firebase/firestore';
import { firebase_db, firebase_auth } from '@/firebase';
import { router } from 'expo-router';
import { getOrCreateChat } from '@/lib/chat';
import {
  sendFriendRequest, acceptRequest, rejectRequest,
} from '@/lib/friends';


type Listing = {
  id: string; modName: string; currentSlot: string; desiredSlot: string;
  classType: string[]; userId: string; username?: string;
};

type FriendRow = { docId: string; uid: string; username: string };

export default function ExploreScreen() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [userResult, setUserResult] = useState<{ uid: string; username: string } | null>(null);
  const [userNotFound, setUserNotFound] = useState(false);
  const [userListings, setUserListings] = useState<Listing[] | null>(null);
  const [listingsLoading, setListingsLoading] = useState(false);

  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [requests, setRequests] = useState<FriendRow[]>([]);

  const me = firebase_auth.currentUser;

  useEffect(() => {
    if (!me) return;

    const ref = collection(firebase_db, 'friendRequests');

    const qFriends = query(ref,
      where('users', 'array-contains', me.uid),
      where('accepted', '==', true),
    );


    const unsubFriends = onSnapshot(qFriends, async snap => {
      const rows: FriendRow[] = [];
      for (const d of snap.docs) {
        const data = d.data() as any;
        const otherUid: string = data.users.find((u: string) => u !== me.uid);
        //look up username
        const uSnap = await getDocs(query(
          collection(firebase_db, 'users'), where('__name__', '==', otherUid)));
        const uName = uSnap.empty ? otherUid
          : (uSnap.docs[0].data() as any).username ?? otherUid;
        rows.push({ docId: d.id, uid: otherUid, username: uName });
      }
      setFriends(rows);
    });

    //pending and I am the recipient
    const qReq = query(ref,
      where('users', 'array-contains', me.uid),
      where('accepted', '==', false),
    );

    const unsubReq = onSnapshot(qReq, async snap => {
      const rows: FriendRow[] = [];
      for (const d of snap.docs) {
        const data = d.data() as any;
        if (data.requestFrom === me.uid) continue;   //skip outgoing
        const otherUid: string = data.requestFrom;
        const uSnap = await getDocs(query(
          collection(firebase_db, 'users'), where('__name__', '==', otherUid)));
        const uName = uSnap.empty ? otherUid
          : (uSnap.docs[0].data() as any).username ?? otherUid;
        rows.push({ docId: d.id, uid: otherUid, username: uName });
      }
      setRequests(rows);
    });


    return () => { unsubFriends(); unsubReq(); };
  }, [me]);

  const handleSearch = async () => {
    Keyboard.dismiss();
    setUserResult(null); setUserListings(null); setUserNotFound(false);
    if (!search.trim()) return;
    setLoading(true);
    try {
      const usersRef = collection(firebase_db, 'users');
      const q = query(usersRef, where('username', '==', search.trim()));
      const snap = await getDocs(q);
      if (snap.empty) { setUserNotFound(true); return; }


      const userDoc = snap.docs[0];
      setUserResult({ uid: userDoc.id, username: userDoc.data().username });
      setListingsLoading(true);


      const listingsRef = collection(firebase_db, 'listings');
      const qListings = query(listingsRef, where('userId', '==', userDoc.id));
      const listingsSnap = await getDocs(qListings);
      const items: Listing[] = listingsSnap.docs.map(d => {
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
    } catch { setUserNotFound(true); }
    finally { setLoading(false); setListingsLoading(false); }
  };

  const onSubmitEditing = () => handleSearch();

  const handleChat = async (otherUid: string, otherName: string) => {
    if (!me) { Alert.alert('Auth error', 'You must be signed in.'); return; }
    if (otherUid === me.uid) { Alert.alert('Cannot chat yourself'); return; }
    try {
      const chatId = await getOrCreateChat(otherUid);
      router.push({ pathname: '/chat/[chatId]', params: { chatId, otherUid, otherName } });
    } catch { Alert.alert('Error', 'Could not open chat'); }
  };


  const handleAddFriend = async (otherUid: string) => {
    if (!me) { Alert.alert('Auth required'); return; }
    try {
      await sendFriendRequest(otherUid);
      Alert.alert('Request sent', 'Waiting for them to accept.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not send request');
    }
  };

  const renderListing = ({ item }: { item: Listing }) => (
    <View style={styles.card}>
      <Text style={styles.modName}>{item.modName}</Text>
      <Text>Current: {item.currentSlot} → Desired: {item.desiredSlot}</Text>
      <Text>Type: {item.classType?.join(', ') || '—'}</Text>
      <Text style={styles.ownerText}>{item.username || 'Unknown'}</Text>


      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => handleChat(item.userId, item.username || 'User')}
      >
        <Ionicons name="chatbubbles-outline" color="#fff" size={16} />
        <Text style={styles.chatBtnText}>Chat</Text>
      </TouchableOpacity>
    </View>
  );


  const renderFriend = ({ item }: { item: FriendRow }) => (
    <View style={styles.card}>
      <Text style={styles.modName}>{item.username}</Text>
      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => handleChat(item.uid, item.username)}
      >
        <Ionicons name="chatbubbles-outline" color="#fff" size={16} />
        <Text style={styles.chatBtnText}>Chat</Text>
      </TouchableOpacity>
    </View>
  );


  const renderRequest = ({ item }: { item: FriendRow }) => (
    <View style={styles.card}>
      <Text style={styles.modName}>{item.username}</Text>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <TouchableOpacity
          style={[styles.chatBtn, { backgroundColor: '#28a745' }]}
          onPress={() => acceptRequest(item.docId)}
        >
          <Ionicons name="checkmark" color="#fff" size={16} />
          <Text style={styles.chatBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chatBtn, { backgroundColor: '#d9534f', marginLeft: 8 }]}
          onPress={() => rejectRequest(item.docId)}
        >
          <Ionicons name="close" color="#fff" size={16} />
          <Text style={styles.chatBtnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const SearchedUserHeader = () => {
    if (!userResult) return null;
    const alreadyFriend = friends.some(f => f.uid === userResult.uid);
    const pending = requests.some(r => r.uid === userResult.uid)
      || userResult.uid === me?.uid;   //cannot friend yourself
    return (
      <View style={styles.profileSection}>
        <Text style={styles.profileName}>
          Viewing profile: <Text style={styles.username}>{userResult.username}</Text>
        </Text>


        {me && !alreadyFriend && !pending && (
          <TouchableOpacity
            style={[styles.chatBtn, { backgroundColor: '#ff9800', marginBottom: 12 }]}
            onPress={() => handleAddFriend(userResult.uid)}
          >
            <Ionicons name="person-add" color="#fff" size={16} />
            <Text style={styles.chatBtnText}>Add Friend</Text>
          </TouchableOpacity>
        )}


        {alreadyFriend && (
          <Text style={{ color: '#28a745', marginBottom: 12 }}>You are friends</Text>
        )}
        {pending && !alreadyFriend && (
          <Text style={{ color: '#888', marginBottom: 12 }}>Request pending</Text>
        )}


        <Text style={styles.sectionTitle}>Listings</Text>
      </View>
    );
  };


  return (
    <ScrollView                     
      style={styles.outer}
      contentContainerStyle={styles.scrollBody}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>Search User by Username</Text>


      {/* search bar */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="e.g. johnDoe"
          onSubmitEditing={onSubmitEditing}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>


      {loading && <ActivityIndicator style={{ marginTop: 12 }} />}


      {userNotFound && <Text style={styles.emptyText}>No user found.</Text>}


      {/* Listings section (shown only after search) */}
      {userResult && (
        <View style={[styles.sectionWrapper, styles.listingsWrapper]}>
          <SearchedUserHeader />


          {listingsLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} />
          ) : userListings && userListings.length === 0 ? (
            <Text style={styles.emptyText}>This user has no listings.</Text>
          ) : (
            <FlatList
              data={userListings ?? []}
              keyExtractor={i => i.id}
              renderItem={renderListing}
              contentContainerStyle={{ paddingBottom: 32 }}
              style={styles.previewList}
              nestedScrollEnabled
            />
          )}
        </View>
      )}


      {/* Friends section */}
      <View style={[styles.sectionWrapper, styles.friendsWrapper]}>
        <Text style={[styles.sectionTitle, { marginHorizontal: 16 }]}>Friends</Text>
        {friends.length === 0 ? (
          <Text style={styles.emptyText}>No friends yet.</Text>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={i => i.docId}
            renderItem={renderFriend}
            contentContainerStyle={{ paddingBottom: 16 }}
            style={styles.previewList}
            nestedScrollEnabled
          />
        )}
      </View>


      {/* Friend Requests section */}
      <View style={[styles.sectionWrapper, styles.requestsWrapper]}>
        <Text style={[styles.sectionTitle, { marginHorizontal: 16 }]}>Friend Requests</Text>
        {requests.length === 0 ? (
          <Text style={styles.emptyText}>No incoming requests.</Text>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={i => i.docId}
            renderItem={renderRequest}
            contentContainerStyle={{ paddingBottom: 32 }}
            style={styles.previewList}
            nestedScrollEnabled
          />
        )}
      </View>
    </ScrollView>
  );
}


/* styles (existing + new additions) */
const styles = StyleSheet.create({
  /* container & scroll */
  outer: { flex: 1, backgroundColor: '#fff' },
  scrollBody: { paddingBottom: 40 },


  /* search & profile (unchanged) */
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, marginTop: 16, marginLeft: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginHorizontal: 16 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8
  },
  searchBtn: { backgroundColor: '#007bff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  searchBtnText: { color: '#fff', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#888' },


  profileSection: {
    backgroundColor: '#f8f8f8', borderRadius: 10, padding: 18,
    marginTop: 20, marginHorizontal: 12
  },
  profileName: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  username: { color: '#007bff', fontWeight: 'bold' },
  sectionTitle: { marginTop: 16, marginBottom: 8, fontSize: 18, fontWeight: '700' },


  /* cards */
  card: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, marginBottom: 12, backgroundColor: '#fff', marginHorizontal: 12
  },
  modName: { fontWeight: '600', fontSize: 16, marginBottom: 4 },
  ownerText: { color: '#888', marginTop: 4, fontSize: 13 },


  /* buttons */
  chatBtn: {
    marginTop: 8, backgroundColor: '#28a745', paddingVertical: 6,
    borderRadius: 6, alignItems: 'center', flexDirection: 'row',
    alignSelf: 'flex-start', paddingHorizontal: 12
  },
  chatBtnText: { color: '#fff', fontWeight: '600', marginLeft: 2 },


  /* new: list preview window */
  previewList: {
    maxHeight: 350,
    flexGrow: 0,
  },

  /* new: section wrappers */
  sectionWrapper: {
    marginTop: 24,
    marginHorizontal: 10,
    borderRadius: 10,
    paddingVertical: 12,
  },
  listingsWrapper: { backgroundColor: '#e3f2fd' },  // light blue
  friendsWrapper: { backgroundColor: '#e8f5e9' },  // light green
  requestsWrapper: { backgroundColor: '#fff3e0' },  // light orange
});



