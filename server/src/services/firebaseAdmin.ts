import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getFirebaseAdminAuth() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  }

  let serviceAccount: {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON');
  }

  const app = getApps()[0] || initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key?.replace(/\\n/g, '\n'),
    }),
  });

  return getAuth(app);
}

export async function verifyFirebaseIdToken(idToken: string) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Firebase ID token is required');
  }
  return getFirebaseAdminAuth().verifyIdToken(idToken, true);
}

export async function deleteFirebaseUser(uid: string): Promise<void> {
  if (!uid) return;
  await getFirebaseAdminAuth().deleteUser(uid);
}
