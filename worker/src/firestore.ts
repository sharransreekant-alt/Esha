// Minimal Firestore REST client. Every call carries the parent's own Firebase ID token,
// so the database security rules decide what is allowed, exactly as they do for the app.

export class FirestoreError extends Error {
  constructor(public status: number) { super(`firestore ${status}`) }
}

// Trades a Firebase refresh token for a short-lived ID token.
export async function exchangeRefreshToken(refreshToken: string, apiKey: string): Promise<{ idToken: string; uid: string } | null> {
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  if (!res.ok) return null
  const data = await res.json() as { id_token?: string; user_id?: string }
  return data.id_token && data.user_id ? { idToken: data.id_token, uid: data.user_id } : null
}

type Value = Record<string, unknown>

export function encodeValue(v: unknown): Value {
  if (v === null || v === undefined) return { nullValue: null }
  if (v instanceof Date)        return { timestampValue: v.toISOString() }
  if (typeof v === 'string')    return { stringValue: v }
  if (typeof v === 'boolean')   return { booleanValue: v }
  if (typeof v === 'number')    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (Array.isArray(v))         return { arrayValue: { values: v.map(encodeValue) } }
  return { mapValue: { fields: encodeFields(v as Record<string, unknown>) } }
}

export function encodeFields(obj: Record<string, unknown>): Record<string, Value> {
  const out: Record<string, Value> = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = encodeValue(v)
  return out
}

export function decodeValue(v: any): unknown {
  if (!v || 'nullValue' in v)  return null
  if ('stringValue' in v)      return v.stringValue
  if ('booleanValue' in v)     return v.booleanValue
  if ('integerValue' in v)     return Number(v.integerValue)
  if ('doubleValue' in v)      return v.doubleValue
  if ('timestampValue' in v)   return new Date(v.timestampValue)
  if ('arrayValue' in v)       return (v.arrayValue.values || []).map(decodeValue)
  if ('mapValue' in v)         return decodeFields(v.mapValue.fields || {})
  return null
}

export function decodeFields(fields: Record<string, any>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]))
}

export function newDocId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(20)), b => chars[b % chars.length]).join('')
}

export class Firestore {
  private base: string
  private root: string
  constructor(projectId: string, private idToken: string) {
    this.root = `projects/${projectId}/databases/(default)/documents`
    this.base = `https://firestore.googleapis.com/v1/${this.root}`
  }

  // "families/abc/entries" is queried as collection "entries" under parent "families/abc"
  private queryTarget(collectionPath: string): { url: string; collectionId: string } {
    const parts = collectionPath.split('/')
    const collectionId = parts.pop()!
    return { url: `${parts.length ? '/' + parts.join('/') : ''}:runQuery`, collectionId }
  }

  private async post(path: string, body: unknown): Promise<any> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.idToken}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new FirestoreError(res.status)
    return res.json()
  }

  async getDoc(collection: string, id: string): Promise<Record<string, unknown> | null> {
    const res = await fetch(`${this.base}/${collection}/${id}`, { headers: { Authorization: `Bearer ${this.idToken}` } })
    if (res.status === 404) return null
    if (!res.ok) throw new FirestoreError(res.status)
    return decodeFields((await res.json() as any).fields || {})
  }

  // Newest documents first.
  async latest(collection: string, orderField: string, limit: number): Promise<Record<string, unknown>[]> {
    const { url, collectionId } = this.queryTarget(collection)
    const rows = await this.post(url, {
      structuredQuery: {
        from: [{ collectionId }],
        orderBy: [{ field: { fieldPath: orderField }, direction: 'DESCENDING' }],
        limit,
      },
    })
    return (rows as any[]).filter(r => r.document).map(r => decodeFields(r.document.fields || {}))
  }

  async whereEquals(collection: string, field: string, value: string, select: string[]): Promise<Record<string, unknown>[]> {
    const { url, collectionId } = this.queryTarget(collection)
    const rows = await this.post(url, {
      structuredQuery: {
        from: [{ collectionId }],
        where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } },
        select: { fields: select.map(fieldPath => ({ fieldPath })) },
      },
    })
    return (rows as any[]).filter(r => r.document).map(r => decodeFields(r.document.fields || {}))
  }

  // Creates all documents or none. Returns their ids.
  async createAll(collection: string, docs: Record<string, unknown>[]): Promise<string[]> {
    const ids = docs.map(() => newDocId())
    await this.post(':commit', {
      writes: docs.map((d, i) => ({
        update: { name: `${this.root}/${collection}/${ids[i]}`, fields: encodeFields(d) },
        currentDocument: { exists: false },
      })),
    })
    return ids
  }

  async deleteAll(collection: string, ids: string[]): Promise<void> {
    await this.post(':commit', { writes: ids.map(id => ({ delete: `${this.root}/${collection}/${id}` })) })
  }
}
