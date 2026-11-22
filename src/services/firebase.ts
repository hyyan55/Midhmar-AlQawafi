import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  EmailAuthProvider,
  updatePassword,
  updateProfile,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBQLe7JXjL0-B241PFmWp2ed2nnELfqZ9Y',
  authDomain: 'midhmar-alqawafi.firebaseapp.com',
  projectId: 'midhmar-alqawafi',
  storageBucket: 'midhmar-alqawafi.firebasestorage.app',
  messagingSenderId: '165771208769',
  appId: '1:165771208769:web:5390a4f85dfc442fd33ec0',
  measurementId: 'G-LHKNMBFD2K',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

export {
  createUserWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  EmailAuthProvider,
  updatePassword,
  updateProfile,
};
