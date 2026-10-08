import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import {
  getAuth, signInAnonymously, linkWithCredential, linkWithPopup, signInWithCredential,
  signInWithEmailAndPassword, sendPasswordResetEmail, signOut,
  EmailAuthProvider, GoogleAuthProvider,
} from 'firebase/auth'

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

// --- Accounts ------------------------------------------------------------------
// A phone starts with an anonymous identity. Signing in attaches an email or Google
// account to that same identity where possible, so access already granted to this
// phone carries over. If the account already exists (second device), we switch to it.

export type AccountResult = 'linked' | 'signed_in'

export async function signInWithEmail(email: string, password: string): Promise<AccountResult> {
  await ensureSignedIn()
  const user = auth.currentUser!
  if (user.isAnonymous) {
    try {
      await linkWithCredential(user, EmailAuthProvider.credential(email, password))
      return 'linked'
    } catch (e: any) {
      if (e?.code !== 'auth/email-already-in-use' && e?.code !== 'auth/credential-already-in-use') throw e
    }
  }
  await signInWithEmailAndPassword(auth, email, password)
  return 'signed_in'
}

export async function signInWithGoogle(): Promise<AccountResult> {
  await ensureSignedIn()
  const user = auth.currentUser!
  const provider = new GoogleAuthProvider()
  try {
    await linkWithPopup(user, provider)
    return 'linked'
  } catch (e: any) {
    // This Google account already belongs to an existing account: use that one
    if (e?.code === 'auth/provider-already-linked') return 'linked'
    const credential = e?.code === 'auth/credential-already-in-use' ? GoogleAuthProvider.credentialFromError(e) : null
    if (!credential) throw e
    await signInWithCredential(auth, credential)
    return 'signed_in'
  }
}

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

// Signing out returns this phone to a fresh anonymous identity on next use.
export const signOutAccount = () => signOut(auth)

const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-email':            "That email address doesn't look right",
  'auth/missing-password':         'Enter a password',
  'auth/weak-password':            'Use a password of at least 6 characters',
  'auth/wrong-password':           'Wrong email or password',
  'auth/invalid-credential':       'Wrong email or password',
  'auth/user-not-found':           'No account with that email',
  'auth/too-many-requests':        'Too many attempts. Wait a few minutes and try again',
  'auth/network-request-failed':   'No connection. Check your internet and try again',
  'auth/popup-closed-by-user':     'Sign-in was cancelled',
  'auth/cancelled-popup-request':  'Sign-in was cancelled',
  'auth/popup-blocked':            'The sign-in window was blocked. Try again, or use email',
  'auth/operation-not-allowed':    "This sign-in method isn't switched on yet",
  'auth/unauthorized-domain':      "This website isn't approved for sign-in yet",
  'auth/provider-already-linked':  'This phone is already signed in that way',
}
export function authMessage(e: any): string {
  return AUTH_MESSAGES[e?.code] || "Couldn't sign in. Please try again"
}
