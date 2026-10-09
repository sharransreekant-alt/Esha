// Security-rules tests. Run against the local emulator with `npm run test:rules`.
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where, Timestamp,
} from 'firebase/firestore'

let env: RulesTestEnvironment

const hours = (n: number) => Timestamp.fromMillis(Date.now() + n * 3600000)

// Signed in with a real account (Google), as the app requires before creating a family.
const as = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com', identities: {} } }).firestore()
const anonymous = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous', identities: {} } }).firestore()
const nobody = () => env.unauthenticatedContext().firestore()

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-esha',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8085 },
  })
})
afterAll(async () => { await env.cleanup() })

// Two families. famA is also the family the original shared lists belong to.
//   famA: ana (creator), ben      famB: cara (creator)      dave: signed in, no family
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'families/famA'), { babyName: 'A', createdBy: 'ana' })
    await setDoc(doc(db, 'families/famA/members/ana'), { name: 'Ana', role: 'parent' })
    await setDoc(doc(db, 'families/famA/members/ben'), { name: 'Ben', role: 'parent' })
    await setDoc(doc(db, 'families/famA/entries/e1'), { type: 'feed', timestamp: Timestamp.now(), loggedBy: 'Ana' })
    await setDoc(doc(db, 'families/famA/growth/g1'), { weight: 7000, timestamp: Timestamp.now() })
    await setDoc(doc(db, 'families/famB'), { babyName: 'B', createdBy: 'cara' })
    await setDoc(doc(db, 'families/famB/members/cara'), { name: 'Cara', role: 'parent' })
    await setDoc(doc(db, 'families/famB/entries/e1'), { type: 'wee', timestamp: Timestamp.now(), loggedBy: 'Cara' })
    await setDoc(doc(db, 'users/ana'), { familyId: 'famA', usingFamily: true })
    await setDoc(doc(db, 'users/cara'), { familyId: 'famB', usingFamily: true })
    await setDoc(doc(db, 'invites/GOODCODE'), { familyId: 'famA', createdBy: 'ana', expiresAt: hours(24) })
    await setDoc(doc(db, 'invites/OLDCODE1'), { familyId: 'famA', createdBy: 'ana', expiresAt: hours(-1) })
    await setDoc(doc(db, 'esha_settings/config'), { familyId: 'famA', movedToFamily: true })
    await setDoc(doc(db, 'esha_entries/old1'), { type: 'feed', timestamp: Timestamp.now() })
  })
})

describe('a family member', () => {
  it('reads and writes every list in their own family, the way the app queries them', async () => {
    const db = as('ana')
    await assertSucceeds(getDoc(doc(db, 'families/famA')))
    await assertSucceeds(getDocs(query(collection(db, 'families/famA/entries'), where('timestamp', '>=', hours(-24)), orderBy('timestamp', 'desc'))))
    await assertSucceeds(getDocs(query(collection(db, 'families/famA/entries'), where('type', '==', 'note'))))
    await assertSucceeds(getDocs(query(collection(db, 'families/famA/handovers'), orderBy('timestamp', 'desc'), limit(20))))
    await assertSucceeds(getCountFromServer(collection(db, 'families/famA/entries')))
    for (const list of ['entries', 'growth', 'journal', 'handovers', 'appointments']) {
      await assertSucceeds(setDoc(doc(db, `families/famA/${list}/new`), { timestamp: Timestamp.now() }))
      await assertSucceeds(deleteDoc(doc(db, `families/famA/${list}/new`)))
    }
    await assertSucceeds(updateDoc(doc(db, 'families/famA'), { activeGoals: { poosPerDay: 1 }, feedCycleHours: 4 }))
    await assertSucceeds(getDocs(collection(db, 'families/famA/members')))
  })

  it('the second parent has the same access as the creator', async () => {
    await assertSucceeds(getDocs(collection(as('ben'), 'families/famA/entries')))
    await assertSucceeds(setDoc(doc(as('ben'), 'families/famA/entries/fromBen'), { type: 'poo', timestamp: Timestamp.now() }))
  })

  it("cannot reach another family's records, even knowing its id", async () => {
    const db = as('ana')
    await assertFails(getDoc(doc(db, 'families/famB')))
    await assertFails(getDoc(doc(db, 'families/famB/entries/e1')))
    await assertFails(getDocs(collection(db, 'families/famB/entries')))
    await assertFails(getCountFromServer(collection(db, 'families/famB/entries')))
    await assertFails(getDocs(collection(db, 'families/famB/members')))
    await assertFails(setDoc(doc(db, 'families/famB/entries/x'), { type: 'note' }))
    await assertFails(deleteDoc(doc(db, 'families/famB/entries/e1')))
    await assertFails(updateDoc(doc(db, 'families/famB'), { babyName: 'hacked' }))
  })

  it('cannot list families, delete a family, or hand it to someone else', async () => {
    const db = as('ana')
    await assertFails(getDocs(collection(db, 'families')))
    await assertFails(deleteDoc(doc(db, 'families/famA')))
    await assertFails(updateDoc(doc(db, 'families/famA'), { createdBy: 'dave' }))
  })

  it('can leave, but cannot remove or impersonate the other parent', async () => {
    await assertFails(deleteDoc(doc(as('ana'), 'families/famA/members/ben')))
    await assertFails(setDoc(doc(as('ana'), 'families/famA/members/ben'), { name: 'Not Ben' }))
    await assertSucceeds(deleteDoc(doc(as('ben'), 'families/famA/members/ben')))
    await assertFails(getDocs(collection(as('ben'), 'families/famA/entries')))   // no longer a member
  })

  it('cannot write lists that are not part of the layout', async () => {
    await assertFails(setDoc(doc(as('ana'), 'families/famA/secrets/x'), { a: 1 }))
  })
})

describe('someone who is not a member', () => {
  it('signed out: sees nothing at all', async () => {
    const db = nobody()
    await assertFails(getDoc(doc(db, 'families/famA')))
    await assertFails(getDocs(collection(db, 'families/famA/entries')))
    await assertFails(getDoc(doc(db, 'users/ana')))
    await assertFails(getDoc(doc(db, 'invites/GOODCODE')))
    await assertFails(getDocs(collection(db, 'esha_entries')))
  })

  it('signed in without a family: cannot read or write any family', async () => {
    const db = as('dave')
    await assertFails(getDoc(doc(db, 'families/famA')))
    await assertFails(getDocs(collection(db, 'families/famA/entries')))
    await assertFails(setDoc(doc(db, 'families/famA/entries/x'), { type: 'note' }))
    await assertFails(getDocs(collection(db, 'families/famA/members')))
  })

  it('cannot add themselves to a family without an invite', async () => {
    await assertFails(setDoc(doc(as('dave'), 'families/famA/members/dave'), { name: 'Dave', role: 'parent' }))
    await assertFails(setDoc(doc(as('dave'), 'families/famA/members/dave'), { name: 'Dave', inviteCode: 'NOSUCHCODE' }))
  })

  it("cannot read or change another account's family pointer", async () => {
    await assertFails(getDoc(doc(as('dave'), 'users/ana')))
    await assertFails(setDoc(doc(as('dave'), 'users/ana'), { familyId: 'famB' }))
    await assertSucceeds(setDoc(doc(as('dave'), 'users/dave'), { familyId: 'famA', usingFamily: true }))
    // Pointing your own account at a family does not make you a member of it
    await assertFails(getDocs(collection(as('dave'), 'families/famA/entries')))
  })

  it('cannot touch collections outside the layout', async () => {
    await assertFails(setDoc(doc(as('dave'), 'anything/x'), { a: 1 }))
    await assertFails(getDocs(collection(as('ana'), 'anything')))
  })
})

describe('creating a family', () => {
  it('a signed-in parent creates one and becomes its first member', async () => {
    const db = as('dave')
    await assertSucceeds(setDoc(doc(db, 'families/famD'), { babyName: 'D', createdBy: 'dave' }))
    await assertSucceeds(setDoc(doc(db, 'families/famD/members/dave'), { name: 'Dave', role: 'parent' }))
    await assertSucceeds(setDoc(doc(db, 'families/famD/entries/first'), { type: 'feed', timestamp: Timestamp.now() }))
  })

  it('cannot be created in someone else\'s name, or by an anonymous phone identity', async () => {
    await assertFails(setDoc(doc(as('dave'), 'families/famD'), { babyName: 'D', createdBy: 'ana' }))
    await assertFails(setDoc(doc(anonymous('anon1'), 'families/famX'), { babyName: 'X', createdBy: 'anon1' }))
  })

  it("the creator rule does not let a stranger join someone else's family", async () => {
    await assertFails(setDoc(doc(as('cara'), 'families/famA/members/cara'), { name: 'Cara' }))
  })
})

describe('invites', () => {
  it('a valid code lets the holder join that family, and only that family', async () => {
    const db = as('dave')
    await assertSucceeds(getDoc(doc(db, 'invites/GOODCODE')))
    await assertFails(setDoc(doc(db, 'families/famB/members/dave'), { name: 'Dave', inviteCode: 'GOODCODE' }))
    await assertSucceeds(setDoc(doc(db, 'families/famA/members/dave'), { name: 'Dave', role: 'parent', inviteCode: 'GOODCODE' }))
    await assertSucceeds(getDocs(collection(db, 'families/famA/entries')))
    await assertSucceeds(deleteDoc(doc(db, 'invites/GOODCODE')))   // used up
  })

  it('an expired code is refused', async () => {
    await assertFails(setDoc(doc(as('dave'), 'families/famA/members/dave'), { name: 'Dave', inviteCode: 'OLDCODE1' }))
  })

  it("a code cannot be used to add someone else's account", async () => {
    await assertFails(setDoc(doc(as('dave'), 'families/famA/members/cara'), { name: 'Cara', inviteCode: 'GOODCODE' }))
  })

  it('codes cannot be listed', async () => {
    await assertFails(getDocs(collection(as('ana'), 'invites')))
    await assertFails(getDocs(collection(as('dave'), 'invites')))
  })

  it('only a member can create a code, only for their own family, and only short-lived', async () => {
    await assertSucceeds(setDoc(doc(as('ana'), 'invites/NEWCODE1'), { familyId: 'famA', createdBy: 'ana', expiresAt: hours(48) }))
    await assertFails(setDoc(doc(as('ana'), 'invites/NEWCODE2'), { familyId: 'famB', createdBy: 'ana', expiresAt: hours(48) }))
    await assertFails(setDoc(doc(as('dave'), 'invites/NEWCODE3'), { familyId: 'famA', createdBy: 'dave', expiresAt: hours(48) }))
    await assertFails(setDoc(doc(as('ana'), 'invites/NEWCODE4'), { familyId: 'famA', createdBy: 'ana', expiresAt: hours(24 * 30) }))
    await assertFails(setDoc(doc(as('ana'), 'invites/NEWCODE5'), { familyId: 'famA', createdBy: 'ben', expiresAt: hours(48) }))
  })

  it('a non-member cannot delete a code', async () => {
    await assertFails(deleteDoc(doc(as('dave'), 'invites/GOODCODE')))
  })
})

describe('the original shared lists (backup)', () => {
  it('stay open to members of the family that moved out of them', async () => {
    await assertSucceeds(getDocs(collection(as('ana'), 'esha_entries')))
    await assertSucceeds(getCountFromServer(collection(as('ben'), 'esha_entries')))
    await assertSucceeds(getDoc(doc(as('ana'), 'esha_settings/config')))
    await assertSucceeds(setDoc(doc(as('ana'), 'esha_settings/config'), { movedToFamily: false }, { merge: true }))
  })

  it('are closed to everyone else', async () => {
    await assertFails(getDocs(collection(as('cara'), 'esha_entries')))
    await assertFails(getDoc(doc(as('dave'), 'esha_settings/config')))
    await assertFails(setDoc(doc(as('dave'), 'esha_entries/x'), { type: 'note' }))
    await assertFails(setDoc(doc(as('cara'), 'esha_settings/config'), { familyId: 'famB' }, { merge: true }))
  })
})
