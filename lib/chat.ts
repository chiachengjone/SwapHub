import {
    collection, addDoc, getDocs, query, where,
    onSnapshot, doc, setDoc, updateDoc, orderBy,
    serverTimestamp
  } from 'firebase/firestore';
  import { firebase_db, firebase_auth } from '@/firebase';
  
  const chatsCol = collection(firebase_db, 'chats');
  
  // create or return a 1-to-1 room between the current user and otherUid
  export async function getOrCreateChat(otherUid: string) {
    const me = firebase_auth.currentUser!.uid;
  
    // does a room with these two users already exist?
    const q = query(chatsCol, where('members', 'array-contains', me));
    const snap = await getDocs(q);
    const found = snap.docs.find(d => d.data().members.includes(otherUid));
    if (found) return found.id;
  
    // create a new room
    const chatDoc = await addDoc(chatsCol, {
      members: [me, otherUid],
      lastMessage: '',
      lastTime: serverTimestamp(),
    });
    return chatDoc.id;
  }
  
  // live unread-message counter for the tab badge
export function listenUnseen(uid: string, cb: (count: number) => void) {
    const userChats = query(chatsCol, where('members', 'array-contains', uid));
    let msgUnsubs: Array<() => void> = [];

    const unsubChats = onSnapshot(
      userChats,
      qs => {
        msgUnsubs.forEach(u => u());
        msgUnsubs = [];

        let total = 0;

        qs.forEach(chat => {
          if (!chat.data().members.includes(uid)) return;

          const msgs = collection(firebase_db, `messages/${chat.id}/items`);
          const unsubMsgs = onSnapshot(
            query(msgs, where('seenBy', 'not-in', [uid])),
            unseenSnap => {
              total += unseenSnap.size;
              cb(total);
            },
            err => {
              if (err?.code !== 'permission-denied') {
                console.error('Unseen messages listener error', err);
              }
            }
          );
          msgUnsubs.push(unsubMsgs);
        });
      },
      err => {
        if (err?.code !== 'permission-denied') {
          console.error('Chats badge listener error', err);
        }
      }
    );

    return () => {
      msgUnsubs.forEach(u => u());
      msgUnsubs = [];
      unsubChats();
    };
  }
