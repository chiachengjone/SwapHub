import React, { useState } from 'react';
import { View, TextInput, Button, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { firebase_db } from '@/firebase';
import { firebase_auth } from '@/firebase';

const CLASS_TYPE_OPTIONS = ["Lecture", "Tutorial", "Lab"];

export default function NotificationsScreen() {
  const [modName, setModName] = useState('');
  const [currentSlot, setCurrentSlot] = useState('');
  const [desiredSlot, setDesiredSlot] = useState('');
  const [classType, setClassType] = useState<string[]>([]);

  const handleToggleClassType = (option: string) => {
    if (classType.includes(option)) {
      setClassType(classType.filter(item => item !== option));
    } else {
      setClassType([...classType, option]);
    }
  };

  const handleSubmit = async () => {
    const user = firebase_auth.currentUser;
    if (!user) {
      alert('You must be signed in to post a listing.');
      return;
    }

    // Fetch username from users collection
    let username = '';
    try {
      const userDoc = await getDoc(doc(firebase_db, 'users', user.uid));
      if (userDoc.exists()) {
        username = userDoc.data().username || '';
      }
    } catch (e) {
      username = '';
    }

    await addDoc(collection(firebase_db, 'listings'), {
      modName,
      currentSlot,
      desiredSlot,
      classType,
      userId: user.uid,
      username,
    });

    setModName('');
    setCurrentSlot('');
    setDesiredSlot('');
    setClassType([]);
    alert('Listing posted!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create a New Listing</Text>

      <Text style={styles.label}>Module Name:</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. CS2103"
        value={modName}
        onChangeText={setModName}
      />

      <Text style={styles.label}>Current Slot:</Text>
      <TextInput
        style={styles.input}
        placeholder="Your current slot"
        value={currentSlot}
        onChangeText={setCurrentSlot}
      />

      <Text style={styles.label}>Desired Slot:</Text>
      <TextInput
        style={styles.input}
        placeholder="Slot you want"
        value={desiredSlot}
        onChangeText={setDesiredSlot}
      />

      <Text style={styles.label}>Class Types:</Text>
      {CLASS_TYPE_OPTIONS.map(option => (
        <TouchableOpacity
          key={option}
          onPress={() => handleToggleClassType(option)}
          style={styles.checkboxContainer}
        >
          <View
            style={[
              styles.checkbox,
              classType.includes(option) && styles.checkboxChecked
            ]}
          />
          <Text style={styles.checkboxLabel}>{option}</Text>
        </TouchableOpacity>
      ))}

      <Button title="Post Listing" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12 },
  label: { fontWeight: 'bold', marginBottom: 8 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#fff',
    marginRight: 8,
    borderRadius: 4,
  },
  checkboxChecked: { backgroundColor: '#333' },
  checkboxLabel: { fontSize: 16 },
});
