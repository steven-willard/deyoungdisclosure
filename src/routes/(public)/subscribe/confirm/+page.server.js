export async function load({ url }) {
	const token = url.searchParams.get('token')?.trim();
	if (!token) return { status: 'invalid', token: null };
	// Just validate the token exists — don't confirm yet (prevents email scanner pre-click)
	return { status: 'pending', token };
}

export const actions = {
	confirm: async ({ request, platform }) => {
		const data = await request.formData();
		const token = data.get('token')?.toString().trim();
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

		if (!row) return { status: 'invalid' };
		if (row.confirmed) return { status: 'already' };

		try {
			await db.prepare(
				'UPDATE subscribers SET confirmed = 1, confirmed_at = ?, confirm_token = NULL WHERE id = ?'
			).bind(new Date().toISOString(), row.id).run();
		} catch {
			return { status: 'error' };
		}

		return { status: 'ok', email: row.email };
	}
};
