import React, { useState } from 'react';
import { View, TextInput, Button, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { addDoc, collection } from 'firebase/firestore';
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
  // Get the current user
  const user = firebase_auth.currentUser;
  if (!user) {
    alert('You must be signed in to post a listing.');
    return;
  }

  // Add the listing to Firestore with userId
  await addDoc(collection(firebase_db, 'listings'), {
    modName,
    currentSlot,
    desiredSlot,
    classType,
    userId: user.uid, // <-- Add this line
  });

  // Optionally, clear form or navigate
  setModName('');
  setCurrentSlot('');
  setDesiredSlot('');
  setClassType([]);
};


  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create a New Listing</Text>
      <TextInput
        style={styles.input}
        placeholder="Mod Name"
        value={modName}
        onChangeText={setModName}
      />
      <TextInput
        style={styles.input}
        placeholder="Current Slot (e.g., Monday 10am)"
        value={currentSlot}
        onChangeText={setCurrentSlot}
      />
      <TextInput
        style={styles.input}
        placeholder="Desired Slot (e.g., Wednesday 2pm)"
        value={desiredSlot}
        onChangeText={setDesiredSlot}
      />

      <Text style={styles.label}>Class Types:</Text>
      {CLASS_TYPE_OPTIONS.map(option => (
        <TouchableOpacity
          key={option}
          style={styles.checkboxContainer}
          onPress={() => handleToggleClassType(option)}
        >
          <View style={[
            styles.checkbox,
            classType.includes(option) && styles.checkboxChecked
          ]} />
          <Text style={styles.checkboxLabel}>{option}</Text>
        </TouchableOpacity>
      ))}

      <Button title="Create Listing" onPress={handleSubmit} />
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
    width: 20, height: 20, borderWidth: 1, borderColor: '#333',
    backgroundColor: '#fff', marginRight: 8, borderRadius: 4,
  },
  checkboxChecked: { backgroundColor: '#333' },
  checkboxLabel: { fontSize: 16 },
});