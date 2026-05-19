import { fail, redirect } from '@sveltejs/kit';
import { verifyToken, createSession } from '$lib/server/auth.js';

export async function load({ url, platform }) {
	const token = url.searchParams.get('token');
	if (!token) throw redirect(302, '/admin/login');

	// Validate HMAC + expiry only — do NOT touch KV here
	// (scanners hit GET; we only consume the token on POST)
	const payload = await verifyToken(token, platform.env.SESSION_SECRET);
	if (!payload) throw redirect(302, '/admin/login?error=invalid');

	return { token };
}

export const actions = {
	default: async ({ request, platform, cookies }) => {
		const data = await request.formData();
		const token = data.get('token')?.toString();
		if (!token) return fail(400, { error: 'Missing token.' });

		const kv = platform.env.DEYOUNG_KV;
		const secret = platform.env.SESSION_SECRET;

		const payload = await verifyToken(token, secret);
		if (!payload) return fail(400, { error: 'This link has expired or is invalid.' });

		const stored = await kv.get(`magic:${token}`);
		if (!stored) return fail(400, { error: 'This link has already been used or has expired. Request a new one.' });

		await kv.delete(`magic:${token}`);

		const sessionId = await createSession(kv, payload.email);

		cookies.set('session', sessionId, {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: 604800,
			path: '/'
		});

		throw redirect(303, '/admin');
	}
};
