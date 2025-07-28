import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { Link, router, Stack } from 'expo-router';

import InputField from '@/components/InputField';
import SocialLoginButtons from '@/components/SocialLoginButtons';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

//Import Firebase Auth
import { firebase_auth } from '@/firebase'; //Adjust path if needed
import { signInWithEmailAndPassword } from 'firebase/auth';

type Props = {};

const SignInScreen = (props: Props) => {
  //State for input fields and error
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  //Login handler
  const handleLogin = async () => {
    setError('');
    try {
      await signInWithEmailAndPassword(firebase_auth, email, password);
      //Navigate to main app screen
      router.dismissAll();
      router.push('/(tabs)/welcome');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity
          style={{ position: 'absolute', top: 60, left: 24 }}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={28} color={Colors.black} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Login to Your Account</Text>

        {/* Input Fields */}
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

        {/* Error Message */}
        {error ? (
          <Text style={{ color: 'red', marginBottom: 12 }}>{error}</Text>
        ) : null}

        {/* Login Button */}
        <TouchableOpacity style={styles.btn} onPress={handleLogin}>
          <Text style={styles.btnTxt}>Login</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Social Login Buttons */}
        <SocialLoginButtons emailHref={'/'} />

        {/* Sign Up Link */}
        <Text style={styles.loginTxt}>
          Don't have an account?{' '}
          <Link href="/signup" style={styles.loginTxtSpan}>
            Sign Up
          </Link>
        </Text>
      </View>
    </>
  );
};

export default SignInScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: Colors.black,
    marginBottom: 50,
    marginTop: 60,
  },
  btn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: 5,
    marginBottom: 20,
  },
  btnTxt: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loginTxt: {
    marginBottom: 30,
    fontSize: 14,
    color: Colors.black,
    lineHeight: 24,
  },
  loginTxtSpan: {
    color: Colors.primary,
    fontWeight: '600',
  },
  divider: {
    borderTopColor: Colors.gray,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '30%',
    marginBottom: 30,
  },
});