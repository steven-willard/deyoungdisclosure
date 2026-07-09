export async function load({ platform, request }) {
	try {
		const result = await platform.env.DB.prepare(
			`SELECT video_id, type, date, youtube_url, dave_segments
			 FROM meetings
			 WHERE deleted_at IS NULL
			   AND transcript_source = 'assemblyai'
			   AND dave_segments IS NOT NULL
			 ORDER BY date DESC`
		).all();

		const segments = [];
		for (const row of result.results ?? []) {
			const daveSeg = JSON.parse(row.dave_segments ?? '[]');
			for (const seg of daveSeg) {
				segments.push({
					video_id: row.video_id,
					date: row.date,
					meeting_type: row.type,
					base_youtube_url: row.youtube_url,
					...seg,
				});
			}
		}

		return { segments, total: segments.length };
	} catch {
		return { segments: [], total: 0, error: true };
	}
}
