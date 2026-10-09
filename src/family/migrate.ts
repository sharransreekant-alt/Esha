// One-time move of the original shared lists into a family's own folder.
// It only ever reads the old lists; nothing there is changed or deleted.
import {
  collection, doc, getDoc, getDocs, getCountFromServer, setDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { LEGACY, familyPaths, COLLECTIONS, CollectionKey } from './paths'

export type Counts = Record<CollectionKey, number>

// Stay well inside the free plan's daily write allowance (20,000).
export const MAX_COPY_WRITES = 15000
const BATCH = 400

// The original shared data can only become one family. Whoever creates it first leaves a
// marker so the other parent's phone doesn't make a second one.
export async function existingFamilyId(): Promise<string | null> {
  const d = (await getDoc(doc(db, LEGACY.settings))).data()
  return typeof d?.familyId === 'string' ? d.familyId : null
}

export async function createFamily(uid: string, who: string, babyName: string, babyDob: Date): Promise<string> {
  if (await existingFamilyId()) throw new Error('family already exists')
  const ref = doc(collection(db, 'families'))
  await setDoc(ref, { babyName, babyDob: babyDob.toISOString(), createdBy: uid, createdAt: serverTimestamp() })
  await setDoc(doc(db, ref.path, 'members', uid), { name: who, role: 'parent', joinedAt: serverTimestamp() })
  // usingFamily stays false until the copy has been checked and the parent chooses to switch
  await setDoc(doc(db, 'users', uid), { familyId: ref.id, usingFamily: false }, { merge: true })
  await setDoc(doc(db, LEGACY.settings), { familyId: ref.id }, { merge: true })
  return ref.id
}

async function count(path: string): Promise<number> {
  return (await getCountFromServer(collection(db, path))).data().count
}

export async function countAll(familyId: string | null): Promise<Counts> {
  const paths = familyId ? familyPaths(familyId) : LEGACY
  const values = await Promise.all(COLLECTIONS.map(k => count(paths[k])))
  return Object.fromEntries(COLLECTIONS.map((k, i) => [k, values[i]])) as Counts
}

export const total = (c: Counts) => COLLECTIONS.reduce((s, k) => s + c[k], 0)

// Copies every record under the same id, so running it twice gives the same result
// rather than duplicates. Returns how many records were written.
//
// Before the family folder has ever been used, the copy is an exact mirror: records
// changed or deleted in the live data are changed or deleted in the copy. Once the
// folder has gone live it holds entries the old lists don't, so from then on a copy only
// adds old records that are missing and never overwrites or removes anything.
export async function copyAll(familyId: string, onProgress: (done: number, label: string) => void): Promise<number> {
  const target = familyPaths(familyId)
  const hasGoneLive = !!(await getDoc(doc(db, target.settings))).data()?.wentLiveAt
  let done = 0

  for (const key of COLLECTIONS) {
    const [snap, existing] = await Promise.all([getDocs(collection(db, LEGACY[key])), getDocs(collection(db, target[key]))])
    const inFolder = new Set(existing.docs.map(d => d.id))
    const toWrite = hasGoneLive ? snap.docs.filter(d => !inFolder.has(d.id)) : snap.docs

    for (let i = 0; i < toWrite.length; i += BATCH) {
      const batch = writeBatch(db)
      for (const d of toWrite.slice(i, i + BATCH)) batch.set(doc(db, target[key], d.id), d.data())
      await batch.commit()
    }
    done += snap.docs.length
    onProgress(done, key)

    if (!hasGoneLive) {
      const live = new Set(snap.docs.map(d => d.id))
      const stale = existing.docs.filter(d => !live.has(d.id))
      for (let i = 0; i < stale.length; i += BATCH) {
        const batch = writeBatch(db)
        for (const d of stale.slice(i, i + BATCH)) batch.delete(d.ref)
        await batch.commit()
      }
    }
  }

  if (!hasGoneLive) {
    // Goals and feed timing. The old AI key stored alongside them is deliberately left behind.
    const settings = (await getDoc(doc(db, LEGACY.settings))).data() || {}
    const carry: Record<string, unknown> = {}
    if (settings.activeGoals)    carry.activeGoals    = settings.activeGoals
    if (settings.feedCycleHours) carry.feedCycleHours = settings.feedCycleHours
    await setDoc(doc(db, target.settings), { ...carry, copiedAt: serverTimestamp() }, { merge: true })
  }
  return done
}

// --- Switching over ---------------------------------------------------------------

// Moves this family onto its folder. The marker on the old settings stops any phone that
// hasn't joined yet from logging into the old lists while the final copy runs.
export async function switchToFamily(familyId: string, uid: string, onProgress: (done: number, label: string) => void): Promise<void> {
  await setDoc(doc(db, LEGACY.settings), { movedToFamily: true }, { merge: true })
  try {
    await copyAll(familyId, onProgress)
  } catch (e) {
    await setDoc(doc(db, LEGACY.settings), { movedToFamily: false }, { merge: true }).catch(() => {})
    throw e
  }
  // From here the folder holds entries the old lists don't; copyAll becomes add-only
  const family = doc(db, 'families', familyId)
  if (!(await getDoc(family)).data()?.wentLiveAt) await setDoc(family, { wentLiveAt: serverTimestamp() }, { merge: true })
  await setDoc(doc(db, 'users', uid), { familyId, usingFamily: true }, { merge: true })
}

// Puts this phone back on the old lists. Entries logged since switching stay in the family folder.
export async function switchBack(uid: string): Promise<void> {
  await setDoc(doc(db, LEGACY.settings), { movedToFamily: false }, { merge: true })
  await setDoc(doc(db, 'users', uid), { usingFamily: false }, { merge: true })
}

// --- Invites ----------------------------------------------------------------------

const INVITE_HOURS = 48
// No 0/O, 1/I/L: the code is read out or typed by a tired parent
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function newInviteCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), b => ALPHABET[b % ALPHABET.length]).join('')
}
export const tidyCode = (typed: string) => typed.toUpperCase().replace(/[^A-Z0-9]/g, '')

export async function createInvite(familyId: string, uid: string): Promise<{ code: string; expiresAt: Date }> {
  const code = newInviteCode()
  const expiresAt = new Date(Date.now() + INVITE_HOURS * 3600000)
  await setDoc(doc(db, 'invites', code), { familyId, createdBy: uid, expiresAt: Timestamp.fromDate(expiresAt) })
  return { code, expiresAt }
}

export type JoinError = 'not_found' | 'expired'

// Joins the family the code belongs to. The code works once.
export async function joinFamily(typed: string, uid: string, name: string): Promise<JoinError | null> {
  const code = tidyCode(typed)
  if (!code) return 'not_found'
  const invite = (await getDoc(doc(db, 'invites', code))).data()
  if (!invite) return 'not_found'
  if ((invite.expiresAt as Timestamp).toMillis() < Date.now()) return 'expired'

  const familyId = invite.familyId as string
  await setDoc(doc(db, 'families', familyId, 'members', uid), { name, role: 'parent', joinedAt: serverTimestamp(), inviteCode: code })
  await setDoc(doc(db, 'users', uid), { familyId, usingFamily: true }, { merge: true })
  await deleteDoc(doc(db, 'invites', code)).catch(() => {})
  return null
}

export async function listMembers(familyId: string): Promise<string[]> {
  const snap = await getDocs(collection(db, 'families', familyId, 'members'))
  return snap.docs.map(d => String(d.data().name || 'Parent'))
}
