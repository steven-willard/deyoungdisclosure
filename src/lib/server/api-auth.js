import { json } from '@sveltejs/kit';

/**
 * Validates the SMM_AI_API_KEY from the Authorization header.
 * Returns null if valid, or a 401 Response if not.
 */
export function requireApiKey(request, platform) {
	const auth = request.headers.get('Authorization') ?? '';
	const key = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
	if (!key || key !== platform.env.SMM_AI_API_KEY) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	return null;
}
