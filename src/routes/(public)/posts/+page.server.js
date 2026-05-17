export async function load({ platform }) {
	try {
		const result = await platform.env.DB.prepare(
			`SELECT id, title, body, tags, image_url, created_at
			 FROM posts
			 WHERE state = 'published'
			 ORDER BY created_at DESC
			 LIMIT 100`
		).all();

		const posts = (result.results ?? []).map(p => ({
			...p,
			tags: JSON.parse(p.tags ?? '[]'),
			excerpt: stripMarkdown(p.body ?? '').slice(0, 150).trimEnd() + '…'
		}));

		return { posts };
	} catch {
		return { posts: [] };
	}
}

function stripMarkdown(text) {
	return text
		.replace(/#{1,6}\s+/g, '')
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/\*(.+?)\*/g, '$1')
		.replace(/\[(.+?)\]\(.+?\)/g, '$1')
		.replace(/`(.+?)`/g, '$1')
		.replace(/\n+/g, ' ')
		.trim();
}
