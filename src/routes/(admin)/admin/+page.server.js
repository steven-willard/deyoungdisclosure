export async function load({ platform, request }) {
	const kv = platform.env.DEYOUNG_KV;

	const sessionId = request.headers.get('cookie')?.match(/session=([^;]+)/)?.[1];
	const { getSession } = await import('$lib/server/auth.js');
	const session = await getSession(kv, sessionId);
	const ownerEmail = (platform.env.OWNER_EMAIL ?? '').trim().toLowerCase();
	const isOwner = !!(session?.email && session.email.trim().toLowerCase() === ownerEmail);

	const postsList = await kv.list({ prefix: 'posts:' });
	const pendingPosts = [];
	const fbErrorPosts = [];

	for (const key of postsList.keys) {
		const raw = await kv.get(key.name);
		if (!raw) continue;
		const post = JSON.parse(raw);
		if (post.state === 'pending_approval') {
			pendingPosts.push(post);
		} else if (post.state === 'published' && post.fb_publish_error) {
			fbErrorPosts.push(post);
		}
	}

	pendingPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
	fbErrorPosts.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

	const contactList = await kv.list({ prefix: 'contact:' });
	const recentMessages = [];
	for (const key of contactList.keys.slice(0, 3)) {
		const raw = await kv.get(key.name);
		if (raw) recentMessages.push({ id: key.name, ...JSON.parse(raw) });
	}
	recentMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

	const stats = { totalPublished: 0, totalPending: pendingPosts.length, totalMessages: contactList.keys.length };
	try {
		const result = await platform.env.DB.prepare(
			"SELECT COUNT(*) as count FROM posts WHERE state = 'published'"
		).first();
		stats.totalPublished = result?.count ?? 0;
	} catch {
		// D1 may not be set up yet
	}

	return { pendingPosts, fbErrorPosts, recentMessages, stats, isOwner, isAdmin: !!session };
}

export const actions = {
	approve: async ({ request, platform }) => {
		const data = await request.formData();
		const postId = data.get('postId')?.toString();
		const note = data.get('note')?.toString() ?? '';
		if (!postId) return;

		const kv = platform.env.DEYOUNG_KV;
		const sessionId = request.headers.get('cookie')?.match(/session=([^;]+)/)?.[1];
		const { getSession } = await import('$lib/server/auth.js');
		const session = await getSession(kv, sessionId);
		const ownerEmail = (platform.env.OWNER_EMAIL ?? '').trim().toLowerCase();
		if (!session || session.email.trim().toLowerCase() !== ownerEmail) {
			return { error: 'Only Dave can approve posts.' };
		}

		const raw = await kv.get(`posts:${postId}`);
		if (!raw) return;

		const post = JSON.parse(raw);
		const now = new Date().toISOString();
		post.state = 'published';
		post.updated_at = now;
		post.dave_note = note;

		await kv.put(`posts:${postId}`, JSON.stringify(post));

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

		try {
			const subs = await platform.env.DB.prepare(
				"SELECT email, unsubscribe_token FROM subscribers WHERE confirmed = 1"
			).all();
			if (subs.results?.length) {
				const { sendNewsletterEmail } = await import('$lib/server/newsletter.js');
				for (const sub of subs.results) {
					await sendNewsletterEmail(post, sub.email, sub.unsubscribe_token, platform.env.RESEND_API_KEY);
				}
				console.log(`Newsletter sent to ${subs.results.length} subscriber(s) for post ${postId}`);
			}
		} catch (err) {
			console.error('Newsletter blast failed:', err?.message);
		}

		if (post.platforms?.includes('Facebook')) {
			try {
				const { publishToFacebook } = await import('$lib/server/social.js');
				const result = await publishToFacebook(post, platform.env);
				post.fb_post_id = result.id;
				post.fb_publish_error = null;
				await kv.put(`posts:${postId}`, JSON.stringify(post));
			} catch (err) {
				console.error('Facebook publish failed:', err?.message);
				post.fb_publish_error = err?.message ?? 'Unknown error';
				await kv.put(`posts:${postId}`, JSON.stringify(post));
			}
		}

		return { success: true };
	},

	retryFb: async ({ request, platform }) => {
		const data = await request.formData();
		const postId = data.get('postId')?.toString();
		if (!postId) return;

		const kv = platform.env.DEYOUNG_KV;
		const sessionId = request.headers.get('cookie')?.match(/session=([^;]+)/)?.[1];
		const { getSession } = await import('$lib/server/auth.js');
		const session = await getSession(kv, sessionId);
		if (!session) {
			return { error: 'You must be logged in to retry posts.' };
		}

		const raw = await kv.get(`posts:${postId}`);
		if (!raw) return;
		const post = JSON.parse(raw);

		try {
			const { publishToFacebook } = await import('$lib/server/social.js');
			const result = await publishToFacebook(post, platform.env);
			post.fb_post_id = result.id;
			post.fb_publish_error = null;
			await kv.put(`posts:${postId}`, JSON.stringify(post));
			return { success: true };
		} catch (err) {
			console.error('Facebook retry failed:', err?.message);
			post.fb_publish_error = err?.message ?? 'Unknown error';
			await kv.put(`posts:${postId}`, JSON.stringify(post));
			return { error: err?.message };
		}
	},

	reject: async ({ request, platform }) => {
		const data = await request.formData();
		const postId = data.get('postId')?.toString();
		const note = data.get('note')?.toString() ?? '';
		if (!postId) return;

		const kv = platform.env.DEYOUNG_KV;
		const sessionId = request.headers.get('cookie')?.match(/session=([^;]+)/)?.[1];
		const { getSession } = await import('$lib/server/auth.js');
		const session = await getSession(kv, sessionId);
		const ownerEmail = (platform.env.OWNER_EMAIL ?? '').trim().toLowerCase();
		if (!session || session.email.trim().toLowerCase() !== ownerEmail) {
			return { error: 'Only Dave can reject posts.' };
		}

		const raw = await kv.get(`posts:${postId}`);
		if (!raw) return;

		const post = JSON.parse(raw);
		const now = new Date().toISOString();
		post.state = 'rejected';
		post.updated_at = now;
		post.dave_note = note || null;

		await kv.put(`posts:${postId}`, JSON.stringify(post));

		try {
			await platform.env.DB.prepare(
				`INSERT INTO post_transitions (post_id, from_state, to_state, actor, note, transitioned_at)
				 VALUES (?, ?, ?, ?, ?, ?)`
			).bind(postId, 'pending_approval', 'rejected', 'dave', note || null, now).run();
		} catch {
			// D1 not available
		}

		return { success: true };
	}
};
