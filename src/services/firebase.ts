import { getApp, getApps, initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
const firebaseStorage = getStorage(app);

export async function uploadProfilePhoto(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('يرجى اختيار ملف صورة صالح.');
  if (file.size > 8 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 8 ميجابايت.');
  const image = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 512 / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر تجهيز الصورة.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (value) => value ? resolve(value) : reject(new Error('تعذر ضغط الصورة.')), 'image/jpeg', 0.82
  ));
  const photoRef = ref(firebaseStorage, `users/${userId}/avatar.jpg`);
  await uploadBytes(photoRef, blob, { contentType: 'image/jpeg', cacheControl: 'public,max-age=3600' });
  return getDownloadURL(photoRef);
}

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
