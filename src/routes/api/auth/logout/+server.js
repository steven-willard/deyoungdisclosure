import { deleteSession } from '$lib/server/auth.js';

export async function POST({ cookies, platform }) {
	const sessionId = cookies.get('session');
	if (sessionId) {
		await deleteSession(platform.env.DEYOUNG_KV, sessionId);
	}

	return new Response(null, {
		status: 302,
		headers: {
			Location: '/admin/login',
			'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
		}
	});
}
