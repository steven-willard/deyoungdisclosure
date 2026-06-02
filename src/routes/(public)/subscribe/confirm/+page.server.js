export async function load({ url, platform }) {
	const token = url.searchParams.get('token')?.trim();
	if (!token) return { status: 'invalid' };

	const db = platform.env.DB;

	let row;
	try {
		row = await db.prepare(
			'SELECT id, email, confirmed FROM subscribers WHERE confirm_token = ?'
		).bind(token).first();
	} catch {
		return { status: 'error' };
	}

	if (!row || row.confirmed) return { status: 'invalid' };

	try {
		await db.prepare(
			'UPDATE subscribers SET confirmed = 1, confirmed_at = ?, confirm_token = NULL WHERE id = ?'
		).bind(new Date().toISOString(), row.id).run();
	} catch {
		return { status: 'error' };
	}

	return { status: 'ok', email: row.email };
}
