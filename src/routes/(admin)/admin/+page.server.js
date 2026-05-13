export async function load({ platform }) {
	const kv = platform.env.DEYOUNG_KV;

	// Fetch pending posts from KV
	const postsList = await kv.list({ prefix: 'posts:' });
	const pendingPosts = [];

	for (const key of postsList.keys) {
		const raw = await kv.get(key.name);
		if (!raw) continue;
		const post = JSON.parse(raw);
		if (post.state === 'pending_approval') {
			pendingPosts.push(post);
		}
	}

	// Sort pending newest first
	pendingPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

	// Recent inbox messages (last 3)
	const contactList = await kv.list({ prefix: 'contact:' });
	const recentMessages = [];
	for (const key of contactList.keys.slice(0, 3)) {
		const raw = await kv.get(key.name);
		if (raw) recentMessages.push({ id: key.name, ...JSON.parse(raw) });
	}
	recentMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

	// Quick stats from D1
	const stats = { totalPublished: 0, totalPending: pendingPosts.length, totalMessages: contactList.keys.length };
	try {
		const result = await platform.env.DB.prepare(
			"SELECT COUNT(*) as count FROM posts WHERE state = 'published'"
		).first();
		stats.totalPublished = result?.count ?? 0;
	} catch {
		// D1 may not be set up yet
	}

	return { pendingPosts, recentMessages, stats };
}

export const actions = {
	approve: async ({ request, platform }) => {
		const data = await request.formData();
		const postId = data.get('postId')?.toString();
		const note = data.get('note')?.toString() ?? '';
		if (!postId) return;

		const kv = platform.env.DEYOUNG_KV;
		const raw = await kv.get(`posts:${postId}`);
		if (!raw) return;

		const post = JSON.parse(raw);
		const now = new Date().toISOString();
		post.state = 'published';
		post.updated_at = now;
		post.dave_note = note;

		await kv.put(`posts:${postId}`, JSON.stringify(post));

		// Persist to D1
		try {
			await platform.env.DB.prepare(
				`INSERT INTO posts (id, title, body, tags, image_url, platforms, state, created_by, created_at, updated_at, dave_note)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT(id) DO UPDATE SET state=excluded.state, updated_at=excluded.updated_at, dave_note=excluded.dave_note`
			).bind(
				post.id, post.title, post.body, JSON.stringify(post.tags ?? []),
				post.image_url ?? null, JSON.stringify(post.platforms ?? []),
				post.state, post.created_by, post.created_at, now, note || null
			).run();

			await platform.env.DB.prepare(
				`INSERT INTO post_transitions (post_id, from_state, to_state, actor, note, transitioned_at)
				 VALUES (?, ?, ?, ?, ?, ?)`
			).bind(postId, 'pending_approval', 'published', 'dave', note || null, now).run();
		} catch {
			// D1 not available
		}

		return { success: true };
	},

	reject: async ({ request, platform }) => {
		const data = await request.formData();
		const postId = data.get('postId')?.toString();
		if (!postId) return;

		const kv = platform.env.DEYOUNG_KV;
		const raw = await kv.get(`posts:${postId}`);
		if (!raw) return;

		const post = JSON.parse(raw);
		const now = new Date().toISOString();
		post.state = 'rejected';
		post.updated_at = now;

		await kv.put(`posts:${postId}`, JSON.stringify(post));

		try {
			await platform.env.DB.prepare(
				`INSERT INTO post_transitions (post_id, from_state, to_state, actor, note, transitioned_at)
				 VALUES (?, ?, ?, ?, ?, ?)`
			).bind(postId, 'pending_approval', 'rejected', 'dave', null, now).run();
		} catch {
			// D1 not available
		}

		return { success: true };
	}
};
