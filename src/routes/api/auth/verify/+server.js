import { redirect } from '@sveltejs/kit';
import { verifyToken, createSession } from '$lib/server/auth.js';

export async function GET({ url, platform }) {
	const token = url.searchParams.get('token');
	if (!token) throw redirect(302, '/admin/login');

	const kv = platform.env.DEYOUNG_KV;
	const secret = platform.env.SESSION_SECRET;

	// Verify HMAC + expiry
	const payload = await verifyToken(token, secret);
	if (!payload) throw redirect(302, '/admin/login?error=invalid');

	// Check KV (single-use)
	const stored = await kv.get(`magic:${token}`);
	if (!stored) throw redirect(302, '/admin/login?error=expired');

	// Consume the token
	await kv.delete(`magic:${token}`);

	// Create session
	const sessionId = await createSession(kv, payload.email);

	const cookieValue = `session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`;

	return new Response(null, {
		status: 302,
		headers: {
			Location: '/admin',
			'Set-Cookie': cookieValue
		}
	});
}
