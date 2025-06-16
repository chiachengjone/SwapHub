import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import InputField from '@/components/InputField';
import { Colors } from '@/constants/Colors';
import { firebase_auth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const SignUpScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    setError('');
    try {
      await createUserWithEmailAndPassword(firebase_auth, email, password);
      router.replace('/signin'); // Adjust route as needed
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an Account</Text>
      <InputField
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <InputField
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={handleSignUp}>
        <Text style={styles.btnTxt}>Create an Account</Text>
      </TouchableOpacity>
      <Text style={styles.loginTxt}>
        Already have an account?{' '}
        <Text style={styles.loginTxtSpan} onPress={() => router.replace('/signin')}>
          Sign In
        </Text>
      </Text>
    </View>
  );
};

export default SignUpScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: Colors.black,
    marginBottom: 50
  },
  btn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: 5,
    marginBottom: 20
  },
  btnTxt: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600'
  },
    loginTxt: {
    marginBottom: 30,
    fontSize: 14,
    color: Colors.black,
    lineHeight: 24
  },
  loginTxtSpan: {
    color: Colors.primary,
    fontWeight: '600'
  },
  divider: {
    borderTopColor: Colors.gray,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '30%',
    marginBottom: 30
  }
})