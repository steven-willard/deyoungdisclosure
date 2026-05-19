/**
 * Normalize highlight timestamps to seconds.
 * Timestamps were stored inconsistently — some meetings in ms, some in seconds.
 * Within a single meeting all highlights use the same unit, so we detect per-meeting:
 * if the max timestamp across all highlights exceeds 10800 (3 hours in seconds),
 * the whole set must be in milliseconds and we divide by 1000.
 */
export function normalizeHighlightTimestamps(meetings) {
	return meetings.map(m => {
		const max = Math.max(0, ...m.highlights.map(h => h.timestamp_sec ?? 0));
		const isMs = max > 10800;
		return {
			...m,
			highlights: m.highlights.map(h => ({
				...h,
				timestamp_sec: isMs ? Math.floor((h.timestamp_sec ?? 0) / 1000) : (h.timestamp_sec ?? 0)
			}))
		};
	});
}
