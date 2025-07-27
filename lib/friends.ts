// lib/friends.ts
import {
    addDoc, query, where, collection, getDocs,
    updateDoc, deleteDoc, doc, serverTimestamp,
  } from 'firebase/firestore';
  import { firebase_db, firebase_auth } from '@/firebase';
  
  /* ---- utils ----------------------------------------------------- */
  const sortPair = (a: string, b: string) => (a < b ? [a, b] : [b, a]);
  
  const coll = collection(firebase_db, 'friendRequests');
  
  /* ---- read helpers ---------------------------------------------- */
  export async function isFriend(otherUid: string) {
    const me = firebase_auth.currentUser?.uid;
    if (!me) return false;
    const [u1, u2] = sortPair(me, otherUid);
    const q = query(
      coll,
      where('users', '==', [u1, u2]),
      where('accepted', '==', true),
    );
    const snap = await getDocs(q);
    return !snap.empty;
  }
  
  export async function outgoingPending(otherUid: string) {
    const me = firebase_auth.currentUser?.uid;
    if (!me) return false;
    const [u1, u2] = sortPair(me, otherUid);
    const q = query(
      coll,
      where('users', '==', [u1, u2]),
      where('accepted', '==', false),
      where('requestFrom', '==', me),
    );
    const snap = await getDocs(q);
    return !snap.empty;
  }
  
  /* ---- write helpers --------------------------------------------- */
  export async function sendFriendRequest(otherUid: string) {
    const me = firebase_auth.currentUser?.uid;
    if (!me || me === otherUid) throw new Error('Bad call');
    const [u1, u2] = sortPair(me, otherUid);
  
    // abort duplicates ------------------------------------------------
    const already = await outgoingPending(otherUid);
    if (already) return;
  
    await addDoc(coll, {
      users: [u1, u2],
      requestFrom: me,
      accepted: false,
      createdAt: serverTimestamp(),
    });
  }
  
  export async function acceptRequest(docId: string) {
    await updateDoc(doc(firebase_db, 'friendRequests', docId), {
      accepted: true,
      acceptedAt: serverTimestamp(),
    });
  }
  
  export async function rejectRequest(docId: string) {
    await deleteDoc(doc(firebase_db, 'friendRequests', docId));
  }
  