import { createRemoteJWKSet, jwtVerify } from 'jose'

// Public keys Firebase Auth signs ID tokens with.
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

// Returns the Firebase uid, or null if the token is missing or invalid.
export async function verifyIdToken(authHeader: string | null, projectId: string): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), JWKS, {
      issuer:     `https://securetoken.google.com/${projectId}`,
      audience:   projectId,
      algorithms: ['RS256'],
    })
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null
  } catch {
    return null
  }
}
