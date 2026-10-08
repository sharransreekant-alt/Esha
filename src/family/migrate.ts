// One-time move of the original shared lists into a family's own folder.
// It only ever reads the old lists; nothing there is changed or deleted.
import {
  collection, doc, getDoc, getDocs, getCountFromServer, setDoc, writeBatch, serverTimestamp,
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
export async function copyAll(familyId: string, onProgress: (done: number, label: string) => void): Promise<number> {
  const target = familyPaths(familyId)
  let done = 0

  for (const key of COLLECTIONS) {
    const snap = await getDocs(collection(db, LEGACY[key]))
    for (let i = 0; i < snap.docs.length; i += BATCH) {
      const batch = writeBatch(db)
      for (const d of snap.docs.slice(i, i + BATCH)) batch.set(doc(db, target[key], d.id), d.data())
      await batch.commit()
      done += Math.min(BATCH, snap.docs.length - i)
      onProgress(done, key)
    }
  }

  // Goals and feed timing. The old AI key stored alongside them is deliberately left behind.
  const settings = (await getDoc(doc(db, LEGACY.settings))).data() || {}
  const carry: Record<string, unknown> = {}
  if (settings.activeGoals)    carry.activeGoals    = settings.activeGoals
  if (settings.feedCycleHours) carry.feedCycleHours = settings.feedCycleHours
  await setDoc(doc(db, target.settings), { ...carry, copiedAt: serverTimestamp() }, { merge: true })
  return done
}
