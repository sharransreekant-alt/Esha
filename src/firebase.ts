import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            'AIzaSyCRaQAVFHkS3aOQ6Qvv9O0DW6vQ8C6-G40',
  authDomain:        'esha-tracker.firebaseapp.com',
  projectId:         'esha-tracker',
  storageBucket:     'esha-tracker.firebasestorage.app',
  messagingSenderId: '590302372163',
  appId:             '1:590302372163:web:cb0acdc297325bef454ff6',
}

export const app  = initializeApp(firebaseConfig)
export const db   = getFirestore(app)
export const auth = getAuth(app)

// Signs in anonymously on first use and returns a fresh ID token for server calls.
export async function ensureSignedIn(): Promise<string> {
  await auth.authStateReady()
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user
  return user.getIdToken()
}
