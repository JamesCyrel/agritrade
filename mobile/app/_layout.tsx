import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, Href } from 'expo-router';
// Import the provider and hook from its new, correct path
import { AuthProvider, useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

const InitialLayout = () => {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) {
      return; // Wait until session AND profile are loaded
    }

    // segments[0] will be '(auth)', '(consumer)', etc. (with parentheses)
    const inAuthGroup = segments[0] === '(auth)';

    if (session && profile) {
      // User is signed in AND has a profile. NOW it's safe to check role.
      let redirectPath: Href = '/(consumer)/home';
      if (profile.role === 'FARMER') {
        redirectPath = '/(farmer)/home';
      } else if (profile.role === 'ADMIN') {
        redirectPath = '/(admin)/home';
      }

      // If they are in the auth group, redirect them away
      if (inAuthGroup) {
        router.replace(redirectPath);
      }
    } else if (session && !profile) {
      // User is logged in but has no profile (e.g., trigger failed)
      console.warn('User is logged in but has no profile.');
    } else if (!session) {
      // User is not signed in
      // If they are NOT in the (auth) group, send them to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    }
  }, [session, profile, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  // These 'name' props now match your new folder names
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* This line is the fix. It tells the layout what to do with app/index.js */}
      <Stack.Screen name="index" />
      {/* THIS IS THE FIX: You must include (auth) here so you can route to it */}
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/signup" />
      <Stack.Screen name="(consumer)" />
      <Stack.Screen name="(farmer)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}
