// Elvina Neila Samas 24060123120031

import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";



// @ts-ignore
import {
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCxCp8dVML78iOfA7bp8MNhVKslPl53AfU",
  authDomain: "chatapp-d2477.firebaseapp.com",
  projectId: "chatapp-d2477",
  storageBucket: "chatapp-d2477.firebasestorage.app",
  messagingSenderId: "714283741916",
  appId: "1:714283741916:android:94fcea5dc6a073d99a7a19"
};

const app = initializeApp(firebaseConfig);

// Auth + persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Firestore + offline cache
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

const storage = getStorage(app);
const messagesCollection = collection(db, "messages");

export {
  auth,
  db,
  storage,
  messagesCollection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  ref,
  uploadBytes,
  getDownloadURL,
};
