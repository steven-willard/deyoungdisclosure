import { redirect } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth.js';

export async function load({ cookies, platform, url }) {
	// Allow login page to pass through
	if (url.pathname === '/admin/login') return {};

	const sessionId = cookies.get('session');
	const session = await getSession(platform.env.DEYOUNG_KV, sessionId);

	if (!session) {
		throw redirect(302, '/admin/login');
	}

	return { user: { email: session.email } };
}
