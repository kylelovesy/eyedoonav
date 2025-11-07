// jest.setup.js
// This file runs before every test, setting up global mocks.

import '@testing-library/jest-native/extend-expect';

// --- React Native Mocks ---

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    Directions: {},
  };
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.useSharedValue = jest.fn(() => ({ value: 0 }));
  Reanimated.withTiming = jest.fn(val => val);
  Reanimated.withSpring = jest.fn(val => val);
  Reanimated.useAnimatedStyle = jest.fn(() => ({}));
  Reanimated.createAnimatedComponent = jest.fn(component => component);
  return Reanimated;
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// --- Expo Mocks ---

jest.mock('expo-constants', () => ({
  Constants: {
    appOwnership: 'expo', // Mock this to prevent analytics from initializing
  },
}));

// --- Firebase Mocks ---

// --- UPDATED THIS BLOCK ---
// This now handles the getApps/getApp logic to simulate app initialization.
let mockAppInstance = null;
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(config => {
    mockAppInstance = {
      name: 'default',
      options: config,
      // Add other app properties if your code uses them
    };
    return mockAppInstance;
  }),
  getApps: jest.fn(() => {
    return mockAppInstance ? [mockAppInstance] : [];
  }),
  getApp: jest.fn(() => {
    if (!mockAppInstance) {
      throw new Error('Firebase: No app has been initialized (test mock).');
    }
    return mockAppInstance;
  }),
}));
// --- END OF UPDATED BLOCK ---

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
    signOut: jest.fn(() => Promise.resolve()),
    onAuthStateChanged: jest.fn(() => jest.fn()),
  })),
  getReactNativePersistence: jest.fn(() => {
    return { type: 'mockPersistence' };
  }),
  initializeAuth: jest.fn(() => ({
    currentUser: null,
    signOut: jest.fn(() => Promise.resolve()),
    onAuthStateChanged: jest.fn(() => jest.fn()),
  })),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'mock-uid' } })),
  createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'mock-uid' } })),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
}));

// jest.mock('firebase/firestore', () => ({
//   getFirestore: jest.fn(() => ({
//     doc: jest.fn(() => ({
//       id: 'mock-doc-id',
//       get: jest.fn(() => Promise.resolve({ exists: () => false })),
//       set: jest.fn(() => Promise.resolve()),
//       update: jest.fn(() => Promise.resolve()),
//       delete: jest.fn(() => Promise.resolve()),
//       onSnapshot: jest.fn(() => jest.fn()),
//     })),
//     collection: jest.fn(() => ({
//       id: 'mock-collection-id',
//       get: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
//       add: jest.fn(() => Promise.resolve({ id: 'new-mock-doc-id' })),
//       doc: jest.fn(() => ({
//         id: 'mock-doc-id-in-collection',
//         get: jest.fn(() => Promise.resolve({ exists: () => false })),
//         set: jest.fn(() => Promise.resolve()),
//         update: jest.fn(() => Promise.resolve()),
//         delete: jest.fn(() => Promise.resolve()),
//         onSnapshot: jest.fn(() => jest.fn()),
//       })),
//       onSnapshot: jest.fn(() => jest.fn()),
//     })),
//   })),
//   doc: jest.fn(),
//   getDoc: jest.fn(),
//   setDoc: jest.fn(),
//   updateDoc: jest.fn(),
//   deleteDoc: jest.fn(),
//   collection: jest.fn(),
//   query: jest.fn(),
//   where: jest.fn(),
//   getDocs: jest.fn(),
//   onSnapshot: jest.fn(() => jest.fn()),
//   Timestamp: {
//     now: jest.fn(() => ({
//       toDate: () => new Date(),
//       toMillis: () => Date.now(),
//     })),
//     fromDate: jest.fn(date => ({
//       toDate: () => date,
//       toMillis: () => date.getTime(),
//     })),
//   },
// }));
// --- Corrected Firestore Mock ---
const mockFirestore = {
  doc: jest.fn(() => ({
    id: 'mock-doc-id',
    get: jest.fn(() => Promise.resolve({ exists: () => false })),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    onSnapshot: jest.fn(() => jest.fn()),
  })),
  collection: jest.fn(() => ({
    id: 'mock-collection-id',
    get: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
    add: jest.fn(() => Promise.resolve({ id: 'new-mock-doc-id' })),
    doc: jest.fn(() => ({
      id: 'mock-doc-id-in-collection',
      get: jest.fn(() => Promise.resolve({ exists: () => false })),
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      onSnapshot: jest.fn(() => jest.fn()),
    })),
    onSnapshot: jest.fn(() => jest.fn()),
  })),
};

jest.mock('firebase/firestore', () => ({
  // This is the function that was failing
  getFirestore: jest.fn(() => mockFirestore),

  // Also export all the other functions
  doc: mockFirestore.doc,
  collection: mockFirestore.collection,
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  onSnapshot: jest.fn(() => jest.fn()),
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date(),
      toMillis: () => Date.now(),
    })),
    fromDate: jest.fn(date => ({
      toDate: () => date,
      toMillis: () => date.getTime(),
    })),
  },
}));
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({
    ref: jest.fn(() => ({
      put: jest.fn(() => Promise.resolve()),
      getDownloadURL: jest.fn(() => Promise.resolve('http://mock-url.com/file.jpg')),
      delete: jest.fn(() => Promise.resolve()),
    })),
  })),
}));

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({
    logEvent: jest.fn(),
  })),
}));

// --- ADDED THIS BLOCK ---
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({
    // Return a mock functions object
    httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({ data: { success: true } }))),
  })),
  httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({ data: { success: true } }))),
}));
// --- END OF ADDED BLOCK ---

// --- React Native Paper Mocks ---

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
// Store original console methods before overriding
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Mock console.error to suppress React warnings
console.error = (...args) => {
  if (/(react-native-reanimated|React.createFactory)/i.test(String(args[0]))) return;
  originalConsoleError(...args); // Now properly calls the stored original
};

// Mock console.warn similarly if needed
console.warn = (...args) => {
  if (/(react-native-reanimated|React.createFactory)/i.test(String(args[0]))) return;
  originalConsoleWarn(...args);
};

// Restore after all tests (optional, but good practice)
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
