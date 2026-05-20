import { json } from '@sveltejs/kit';

/**
 * Resolve a post ID — supports full UUIDs and short prefixes (e.g. "4a768904").
 * Returns { raw, id } on success, or { response } with a ready error Response.
 *
 * - Exact match → used directly
 * - Prefix match, 1 result → resolved to full ID
 * - Prefix match, 0 results → 404
 * - Prefix match, 2+ results → 409 with colliding IDs listed
 */
export async function resolvePost(kv, id) {
	// Exact match first (full UUID — fast path)
	const exact = await kv.get(`posts:${id}`);
	if (exact) return { raw: exact, id };

	// Prefix scan for short IDs
	const list = await kv.list({ prefix: `posts:${id}` });

	if (list.keys.length === 0) {
		return { response: json({ error: 'Not found' }, { status: 404 }) };
	}

	if (list.keys.length > 1) {
		const matches = list.keys.map(k => k.name.slice('posts:'.length));
		return {
			response: json(
				{ error: `Ambiguous short ID — ${list.keys.length} matches`, matches },
				{ status: 409 }
			)
		};
	}

	const fullId = list.keys[0].name.slice('posts:'.length);
	const raw = await kv.get(`posts:${fullId}`);
	if (!raw) return { response: json({ error: 'Not found' }, { status: 404 }) };

	return { raw, id: fullId };
}
