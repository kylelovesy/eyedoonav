/*---------------------------------------
File: src/config/firebaseConfig.ts
Description: Configures Firebase for the Eye-Doo application.
Initializes Firebase and connects to the database, storage, and functions.
Author: Kyle Lovesy
Date: 26/10-2025 - 22.15
Version: 1.1.0
---------------------------------------*/
// import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore: getReactNativePersistence exists in the RN bundle
// but is often missing from public TypeScript definitions.
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Remove @env import, use Constants instead
const firebaseConfig = {
  apiKey: 'AIzaSyB9Rxh5ZpX2Jlr68abrKRz5tJcDvnamePo',
  authDomain: 'eyedooapp.firebaseapp.com',
  projectId: 'eyedooapp',
  storageBucket: 'eyedooapp.firebasestorage.app',
  messagingSenderId: '396382031987',
  appId: '1:396382031987:web:9909f5fcf9a0e5649f5a06',
  measurementId: 'G-3JZSJFH0JW',
  // apiKey: Constants.expoConfig?.extra?.EXPO_FIREBASE_API_KEY,
  // authDomain: Constants.expoConfig?.extra?.EXPO_FIREBASE_AUTH_DOMAIN,
  // projectId: Constants.expoConfig?.extra?.EXPO_FIREBASE_PROJECT_ID,
  // storageBucket: Constants.expoConfig?.extra?.EXPO_FIREBASE_STORAGE_BUCKET,
  // messagingSenderId: Constants.expoConfig?.extra?.EXPO_FIREBASE_MESSAGING_SENDER_ID,
  // appId: Constants.expoConfig?.extra?.EXPO_FIREBASE_APP_ID,
  // measurementId: Constants.expoConfig?.extra?.EXPO_FIREBASE_MEASUREMENT_ID,
};

// "extra": {
//   "EXPO_FIREBASE_API_KEY": "${EXPO_FIREBASE_API_KEY}",
//   "EXPO_FIREBASE_AUTH_DOMAIN": "${EXPO_FIREBASE_AUTH_DOMAIN}",
//   "EXPO_FIREBASE_PROJECT_ID": "${EXPO_FIREBASE_PROJECT_ID}",
//   "EXPO_FIREBASE_STORAGE_BUCKET": "${EXPO_FIREBASE_STORAGE_BUCKET}",
//   "EXPO_FIREBASE_MESSAGING_SENDER_ID": "${EXPO_FIREBASE_MESSAGING_SENDER_ID}",
//   "EXPO_FIREBASE_APP_ID": "${EXPO_FIREBASE_APP_ID}",
//   "EXPO_FIREBASE_MEASUREMENT_ID": "${EXPO_FIREBASE_MEASUREMENT_ID}"
// }
// EXPO_FIREBASE_API_KEY=AIzaSyB9Rxh5ZpX2Jlr68abrKRz5tJcDvnamePo
// EXPO_FIREBASE_AUTH_DOMAIN=eyedooapp.firebaseapp.com
// EXPO_FIREBASE_PROJECT_ID=eyedooapp
// EXPO_FIREBASE_STORAGE_BUCKET=eyedooapp.firebasestorage.app
// EXPO_FIREBASE_MESSAGING_SENDER_ID=396382031987
// EXPO_FIREBASE_APP_ID=1:396382031987:web:9909f5fcf9a0e5649f5a06
// EXPO_FIREBASE_MEASUREMENT_ID=G-3JZSJFH0JW

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// Auth
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
// Need to add persistence to auth

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);

// Analytics (only works in Expo Go bare workflow or web)
export const analytics = Constants.appOwnership === 'expo' ? null : getAnalytics(app);

// Cloud Functions
export const functions = getFunctions(app);

export default app;
