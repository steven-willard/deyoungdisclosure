export async function load({ url, platform }) {
	const token = url.searchParams.get('token')?.trim();
	if (!token) return { status: 'invalid' };

	const db = platform.env.DB;

	let row;
	try {
		row = await db.prepare(
			'SELECT id, email FROM subscribers WHERE unsubscribe_token = ?'
		).bind(token).first();
	} catch {
		return { status: 'error' };
	}

	if (!row) return { status: 'invalid' };

	try {
		await db.prepare(
			'UPDATE subscribers SET confirmed = 0 WHERE id = ?'
		).bind(row.id).run();
	} catch {
		return { status: 'error' };
	}

	return { status: 'ok', email: row.email };
}
