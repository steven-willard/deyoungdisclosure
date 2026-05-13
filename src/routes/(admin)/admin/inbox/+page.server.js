export async function load({ platform }) {
	const kv = platform.env.DEYOUNG_KV;
	const list = await kv.list({ prefix: 'contact:' });

	const messages = [];
	for (const key of list.keys) {
		const raw = await kv.get(key.name);
		if (!raw) continue;
		messages.push({ id: key.name, ...JSON.parse(raw) });
	}

	messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

	return { messages };
}
