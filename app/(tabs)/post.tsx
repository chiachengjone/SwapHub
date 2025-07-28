import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  Button,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { firebase_db, firebase_auth } from '@/firebase';

const CLASS_TYPE_OPTIONS = ['Lecture', 'Tutorial', 'Lab'];

export default function NotificationsScreen() {
  const [modName, setModName] = useState('');
  const [currentSlot, setCurrentSlot] = useState('');
  const [desiredSlot, setDesiredSlot] = useState('');
  const [classType, setClassType] = useState<string[]>([]); // we’ll keep array, but max 1 elem

  const formIsValid = useMemo(
    () =>
      modName.trim() !== '' &&
      currentSlot.trim() !== '' &&
      desiredSlot.trim() !== '' &&
      classType.length === 1,
    [modName, currentSlot, desiredSlot, classType]
  );

  const handleToggleClassType = (option: string) => {
    setClassType(prev =>
      prev.includes(option) ? []             // tap again, deselect
                           : [option]        // choose new, replace
    );
  };

  const resetForm = () => {
    setModName('');
    setCurrentSlot('');
    setDesiredSlot('');
    setClassType([]);
  };

  const handleSubmit = async () => {
    if (!formIsValid) {
      Alert.alert('Incomplete', 'Please fill in every field.');
      return;
    }

    const user = firebase_auth.currentUser;
    if (!user) {
      Alert.alert('Auth required', 'You must be signed in to post a listing.');
      return;
    }

    /* fetch username */
    let username = '';
    try {
      const snap = await getDoc(doc(firebase_db, 'users', user.uid));
      if (snap.exists()) username = snap.data().username ?? '';
    } catch {
      /* ignore */
    }

    try {
      await addDoc(collection(firebase_db, 'listings'), {
        modName: modName.trim().toUpperCase(),
        currentSlot: currentSlot.trim(),
        desiredSlot: desiredSlot.trim(),
        classType, // will contain exactly one string
        userId: user.uid,
        username,
      });
      Alert.alert('Success', 'Listing posted!');
      resetForm();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not post listing. Please try again.');
    }
  };

  /* UI */
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

      <Text style={styles.label}>Class Type:</Text>
      {CLASS_TYPE_OPTIONS.map(option => (
        <TouchableOpacity
          key={option}
          onPress={() => handleToggleClassType(option)}
          style={styles.checkboxContainer}
        >
          <View
            style={[
              styles.checkbox,
              classType.includes(option) && styles.checkboxChecked,
            ]}
          />
          <Text style={styles.checkboxLabel}>{option}</Text>
        </TouchableOpacity>
      ))}

      <Button title="Post Listing" onPress={handleSubmit} disabled={!formIsValid} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  label: { fontWeight: 'bold', marginBottom: 8 },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
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

