export async function load({ platform }) {
	try {
		const result = await platform.env.DB.prepare(
			`SELECT video_id, type, date, youtube_url, summary, highlights
			 FROM meetings WHERE deleted_at IS NULL ORDER BY date DESC`
		).all();

		const meetings = (result.results ?? []).map(m => ({
			...m,
			highlights: JSON.parse(m.highlights ?? '[]')
		}));

		return { meetings };
	} catch {
		return { meetings: [] };
	}
}
