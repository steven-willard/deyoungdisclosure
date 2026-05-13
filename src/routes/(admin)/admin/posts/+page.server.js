export async function load({ platform }) {
	let posts = [];

	// Try D1 first (permanent record)
	try {
		const result = await platform.env.DB.prepare(
			'SELECT * FROM posts ORDER BY created_at DESC LIMIT 100'
		).all();
		posts = (result.results ?? []).map(p => ({
			...p,
			tags: JSON.parse(p.tags ?? '[]'),
			platforms: JSON.parse(p.platforms ?? '[]')
		}));
	} catch {
		// Fall back to KV if D1 isn't available
		const list = await platform.env.DEYOUNG_KV.list({ prefix: 'posts:' });
		for (const key of list.keys) {
			const raw = await platform.env.DEYOUNG_KV.get(key.name);
			if (raw) posts.push(JSON.parse(raw));
		}
		posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
	}

	return { posts };
}
