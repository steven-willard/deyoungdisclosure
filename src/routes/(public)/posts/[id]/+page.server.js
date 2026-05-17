import { error } from '@sveltejs/kit';
import { marked } from 'marked';

export async function load({ platform, params }) {
	let row;
	try {
		row = await platform.env.DB.prepare(
			`SELECT id, title, body, tags, image_url, created_at
			 FROM posts
			 WHERE id = ? AND state = 'published'`
		).bind(params.id).first();
	} catch {
		error(503, 'Database unavailable');
	}

	if (!row) error(404, 'Post not found');

	const tags = JSON.parse(row.tags ?? '[]');
	const excerpt = row.body
		.replace(/#{1,6}\s+/g, '')
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/\*(.+?)\*/g, '$1')
		.replace(/\[(.+?)\]\(.+?\)/g, '$1')
		.replace(/\n+/g, ' ')
		.trim()
		.slice(0, 160);

	const html = marked.parse(row.body);

	return {
		post: { ...row, tags, excerpt, html }
	};
}
