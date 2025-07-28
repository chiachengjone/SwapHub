import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import {
  GiftedChat,
  IMessage,
  Bubble,
  Send,
  InputToolbar,
  InputToolbarProps,
} from 'react-native-gifted-chat';
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
  Timestamp,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { firebase_db, firebase_auth } from '@/firebase';
import { useLocalSearchParams, useNavigation } from 'expo-router';

/* helper: write a message and bump lastMessage/lastTime in the room */
async function sendMessage(
  chatId: string,
  meUid: string,
  text: string,
  msgsRef: CollectionReference,
) {
  await addDoc(msgsRef, {
    text,
    createdAt: serverTimestamp(),
    senderId: meUid,
    seenBy: [meUid],
  });
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

  // controlled input text
  const [inputText, setInputText] = useState<string>('');

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
      const mapped = snap.docs.map(d => {
        const data = d.data();
        const ts = data.createdAt as Timestamp | null | undefined;
        const createdAt =
          ts && typeof ts.toDate === 'function' ? ts.toDate() : new Date();
        return {
          _id: d.id,
          text: data.text,
          createdAt,
          user: { _id: data.senderId },
        } as IMessage;
      });
      setMessages(mapped);

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

  /* send via send icon */
  const onSend = useCallback(
    (newMsgs: IMessage[] = []) => {
      const { text } = newMsgs[0];
      void sendMessage(chatId as string, me.uid, text.trim(), msgsRef);
      setInputText('');
    },
    [chatId, inputText],
  );

  /* send via Enter/Return */
  const handleEnterSend = useCallback(() => {
    if (inputText.trim()) {
      void sendMessage(chatId as string, me.uid, inputText.trim(), msgsRef);
      setInputText('');
    }
  }, [chatId, inputText]);

  /* custom renderers (UI only) */
  const renderBubble = (props: any) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: styles.rightBubble,
        left: styles.leftBubble,
      }}
      textStyle={{
        right: styles.rightBubbleText,
        left: styles.leftBubbleText,
      }}
    />
  );

  const renderSend = (props: any) => (
    <Send {...props}>
      <View style={{ marginRight: 8, marginBottom: 5 }}>
        <Ionicons
          name="send"
          size={24}
          color={props.text?.trim().length ? '#007bff' : '#ccc'}
        />
      </View>
    </Send>
  );

  const renderInputToolbar = (props: InputToolbarProps<IMessage>) => (
    <InputToolbar
      {...props}
      containerStyle={styles.inputToolbar}
      primaryStyle={{ alignItems: 'center' }}
    />
  );

  const scrollToBottomComponent = () => (
    <Ionicons name="chevron-down" size={24} color="#333" />
  );

  /* render */
  return (
    <SafeAreaView style={styles.safe}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={{ _id: me.uid }}
        text={inputText}
        onInputTextChanged={setInputText}

        // New: send on Enter/Return
        textInputProps={{
          returnKeyType: 'send',
          blurOnSubmit: true,
          onSubmitEditing: handleEnterSend,
        }}

        alwaysShowSend
        placeholder="Type a message…"
        renderBubble={renderBubble}
        renderSend={renderSend}
        renderInputToolbar={renderInputToolbar}
        scrollToBottomComponent={scrollToBottomComponent}
      />
    </SafeAreaView>
  );
}

/* styles */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafe' },

  /* bubbles */
  rightBubble:     { backgroundColor: '#007bff' },
  leftBubble:      { backgroundColor: '#e5e5ea' },
  rightBubbleText: { color: '#fff' },
  leftBubbleText:  { color: '#000' },

  /* input bar */
  inputToolbar: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
});










