const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds
const MAGIC_TTL = 60 * 15; // 15 minutes in seconds

/**
 * Encode ArrayBuffer to URL-safe base64
 */
function toBase64url(buf) {
	return btoa(String.fromCharCode(...new Uint8Array(buf)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

/**
 * Decode URL-safe base64 to ArrayBuffer
 */
function fromBase64url(str) {
	const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
	const bin = atob(b64);
	const buf = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
	return buf.buffer;
}

/**
 * Import HMAC-SHA256 key from raw secret string
 */
async function importKey(secret) {
	const enc = new TextEncoder();
	return crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}

/**
 * Generate HMAC-SHA256 token for data + expiry
 * Returns: base64url(payload).base64url(signature)
 */
export async function generateToken(data, secret) {
	const enc = new TextEncoder();
	const key = await importKey(secret);
	const expiry = Math.floor(Date.now() / 1000) + MAGIC_TTL;
	const payload = JSON.stringify({ ...data, expiry });
	const payloadB64 = toBase64url(enc.encode(payload).buffer);
	const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
	return `${payloadB64}.${toBase64url(sig)}`;
}

/**
 * Verify and decode a token. Returns decoded payload or null if invalid/expired.
 */
export async function verifyToken(token, secret) {
	try {
		const [payloadB64, sigB64] = token.split('.');
		if (!payloadB64 || !sigB64) return null;

		const enc = new TextEncoder();
		const key = await importKey(secret);
		const valid = await crypto.subtle.verify(
			'HMAC',
			key,
			fromBase64url(sigB64),
			enc.encode(payloadB64)
		);
		if (!valid) return null;

		const payload = JSON.parse(new TextDecoder().decode(fromBase64url(payloadB64)));
		if (payload.expiry < Math.floor(Date.now() / 1000)) return null;

		return payload;
	} catch {
		return null;
	}
}

/**
 * Create a new session in KV. Returns sessionId.
 */
export async function createSession(kv, email) {
	const sessionId = toBase64url(crypto.getRandomValues(new Uint8Array(32)).buffer);
	const expires_at = Math.floor(Date.now() / 1000) + SESSION_TTL;
	await kv.put(
		`session:${sessionId}`,
		JSON.stringify({ email, expires_at }),
		{ expirationTtl: SESSION_TTL }
	);
	return sessionId;
}

/**
 * Get session data by ID. Returns { email } or null.
 */
export async function getSession(kv, sessionId) {
	if (!sessionId) return null;
	const raw = await kv.get(`session:${sessionId}`);
	if (!raw) return null;
	try {
		const data = JSON.parse(raw);
		if (data.expires_at < Math.floor(Date.now() / 1000)) return null;
		return { email: data.email };
	} catch {
		return null;
	}
}

/**
 * Delete a session from KV.
 */
export async function deleteSession(kv, sessionId) {
	if (sessionId) await kv.delete(`session:${sessionId}`);
}
