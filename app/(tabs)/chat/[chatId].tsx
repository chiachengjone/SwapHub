import React, { useEffect, useState, useCallback } from 'react';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  CollectionReference,
} from 'firebase/firestore';
import { firebase_db, firebase_auth } from '@/firebase';
import { useLocalSearchParams, useNavigation } from 'expo-router';

/* helper: write a message and bump lastMessage/lastTime in the room */
async function sendMessage(
  chatId: string,
  meUid: string,
  text: string,
  msgsRef: CollectionReference,
) {
  // add the message
  await addDoc(msgsRef, {
    text,
    createdAt: serverTimestamp(),
    senderId: meUid,
    seenBy: [meUid],
  });
  // update the room
  await updateDoc(doc(firebase_db, 'chats', chatId), {
    lastMessage: text,
    lastTime: serverTimestamp(),
  });
}

export default function ChatRoom() {
  const { chatId, otherName } = useLocalSearchParams<{
    chatId: string;
    otherName?: string;
  }>();
  const navigation = useNavigation();
  const me = firebase_auth.currentUser!;

  const [messages, setMessages] = useState<IMessage[]>([]);
  const msgsRef = collection(firebase_db, `messages/${chatId}/items`);

  /* put the other user's name in the header */
  useEffect(() => {
    navigation.setOptions({ title: otherName ?? 'Chat' });
  }, [otherName]);

  /* live listener */
  useEffect(() => {
    const q = query(msgsRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(
        snap.docs.map(d => {
          const data = d.data();
          return {
            _id: d.id,
            text: data.text,
            createdAt: data.createdAt.toDate(),
            user: { _id: data.senderId },
          };
        }),
      );

      /* mark unseen messages as seen */
      snap.docs.forEach(d => {
        const data = d.data();
        if (!data.seenBy?.includes(me.uid)) {
          updateDoc(d.ref, { seenBy: [...(data.seenBy || []), me.uid] });
        }
      });
    });

    return unsub;
  }, [chatId]);

  const onSend = useCallback(
    (newMsgs: IMessage[] = []) => {
      const { text } = newMsgs[0];
      void sendMessage(chatId as string, me.uid, text, msgsRef);
    },
    [chatId],
  );

  return (
    <GiftedChat
      messages={messages}
      onSend={onSend}
      user={{ _id: me.uid }}
      alwaysShowSend
      scrollToBottom
    />
  );
}








