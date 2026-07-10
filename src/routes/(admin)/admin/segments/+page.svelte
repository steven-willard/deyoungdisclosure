<script>
	let { data } = $props();

	let segments = $derived(data.segments ?? []);
	let total = $derived(data.total ?? 0);
	let error = $derived(data.error);

	let search = $state('');

	let filtered = $derived(
		search.trim()
			? segments.filter(s =>
				s.text?.toLowerCase().includes(search.toLowerCase()) ||
				s.topic?.toLowerCase().includes(search.toLowerCase()) ||
				s.date?.toLowerCase().includes(search.toLowerCase())
			)
			: segments
	);

	function formatDate(d) {
		if (!d) return '—';
		// Handles both "June 18 2026" and "2026-06-18"
		try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
		catch { return d; }
	}
</script>

<div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
	<div>
		<h2 class="font-heading text-lg font-bold text-text">My Meeting Segments</h2>
		<p class="text-muted text-xs mt-0.5">
			{#if error}
				Database unavailable — run the D1 migration first.
			{:else}
				{total} statements on the record across all Board of Trustees meetings.
			{/if}
		</p>
	</div>
	{#if total > 0}
		<input
			type="text"
			bind:value={search}
			placeholder="Search statements..."
			class="bg-surface border border-white/10 rounded px-3 py-1.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors w-full sm:w-64"
		/>
	{/if}
</div>

{#if error}
	<div class="bg-surface rounded-lg border border-red-500/20 p-8 text-center">
		<p class="text-red-400 text-sm">Database unavailable. Make sure the migration has been run.</p>
	</div>
{:else if total === 0}
	<div class="bg-surface rounded-lg border border-white/10 p-8 text-center">
		<p class="text-muted text-sm">No segments yet.</p>
		<p class="text-muted text-xs mt-2">Run <code class="bg-white/10 px-1 rounded">sync-youtube</code> with <code class="bg-white/10 px-1 rounded">ASSEMBLYAI_API_KEY</code> set to begin processing Board of Trustees meetings.</p>
	</div>
{:else if filtered.length === 0}
	<div class="bg-surface rounded-lg border border-white/10 p-6 text-center">
		<p class="text-muted text-sm">No results for "{search}"</p>
	</div>
{:else}
	<div class="space-y-3">
		{#each filtered as seg (seg.youtube_url + seg.timestamp_sec)}
			<div class="bg-surface rounded-lg border border-white/10 p-4">
				<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
					<div class="flex items-center gap-2 flex-wrap">
						<span class="text-xs text-muted">{formatDate(seg.date)}</span>
						{#if seg.topic}
							<span class="px-2 py-0.5 text-xs rounded-full bg-accent/10 text-accent border border-accent/20">{seg.topic}</span>
						{/if}
					</div>
					<a
						href={seg.youtube_url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-xs text-accent hover:underline whitespace-nowrap shrink-0"
					>
						▶ Watch at {Math.floor(seg.timestamp_sec / 60)}:{String(seg.timestamp_sec % 60).padStart(2, '0')} →
					</a>
				</div>
				<p class="text-text/80 text-sm leading-relaxed">"{seg.text}"</p>
			</div>
		{/each}
	</div>
	{#if search && filtered.length < total}
		<p class="text-muted text-xs text-center mt-4">Showing {filtered.length} of {total} segments</p>
	{/if}
{/if}
