<script>
	import { marked } from 'marked';

	let { data } = $props();
	const { meetings } = data;

	const BOARD_TYPES = ['Board of Trustees', 'Planning Commission', 'Zoning Board of Appeals'];

	function formatDate(dateStr) {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
	}

	function timestampUrl(youtubeUrl, ms) {
		return `${youtubeUrl}&t=${Math.floor(ms / 1000)}`;
	}

	function formatTimestamp(ms) {
		const totalSec = Math.floor(ms / 1000);
		const m = Math.floor(totalSec / 60);
		const s = totalSec % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	let expanded = $state({});
	function toggle(videoId) {
		expanded[videoId] = !expanded[videoId];
	}
</script>

<svelte:head>
	<title>Meeting Records — Dave DeYoung</title>
	<meta name="description" content="Public board meeting recordings and summaries for Holland Charter Township — Board of Trustees, Planning Commission, and Zoning Board of Appeals." />
</svelte:head>

<div class="max-w-5xl mx-auto px-6 py-16">

	<div class="mb-12">
		<p class="text-accent text-xs font-medium tracking-widest uppercase mb-3">Public Record</p>
		<h1 class="font-heading text-4xl font-bold text-text mb-4">Meeting Records</h1>
		<p class="text-text/60 text-base max-w-2xl leading-relaxed">
			Video recordings of Holland Charter Township board meetings. These videos are posted publicly
			but are otherwise difficult to find — direct links are provided here as a transparency resource.
			Summaries and key moments are generated from official transcripts.
		</p>
	</div>

	{#each BOARD_TYPES as boardType}
		{@const group = meetings.filter(m => m.type === boardType)}
		{#if group.length > 0}
			<section class="mb-14">
				<h2 class="font-heading text-xl font-bold text-text mb-5 pb-3 border-b border-white/10">
					{boardType}
					<span class="text-muted text-sm font-normal ml-2">{group.length} meeting{group.length !== 1 ? 's' : ''}</span>
				</h2>
				<div class="space-y-3">
					{#each group as meeting}
						<div class="bg-surface border border-white/10 rounded-lg overflow-hidden">
							<!-- Meeting header row -->
							<div class="px-5 py-4 flex items-center justify-between gap-4">
								<div class="flex items-center gap-4 min-w-0">
									<div>
										<p class="text-text font-medium text-sm">{formatDate(meeting.date)}</p>
										<p class="text-muted text-xs mt-0.5">{meeting.highlights.length} highlight{meeting.highlights.length !== 1 ? 's' : ''} documented</p>
									</div>
								</div>
								<div class="flex items-center gap-3 shrink-0">
									<a
										href={meeting.youtube_url}
										target="_blank"
										rel="noopener noreferrer"
										class="text-xs px-3 py-1.5 bg-accent/10 border border-accent/30 text-accent rounded hover:bg-accent/20 transition-colors"
									>
										Watch on YouTube →
									</a>
									<button
										type="button"
										onclick={() => toggle(meeting.video_id)}
										class="text-xs text-muted hover:text-text transition-colors"
									>
										{expanded[meeting.video_id] ? '▲ Less' : '▼ Summary'}
									</button>
								</div>
							</div>

							<!-- Expanded: summary + highlights -->
							{#if expanded[meeting.video_id]}
								<div class="border-t border-white/10">
									{#if meeting.summary}
										<div class="px-5 py-4 border-b border-white/5">
											<p class="text-xs font-medium text-accent mb-2 uppercase tracking-wide">Summary</p>
											<div class="post-body text-sm">{@html marked.parse(meeting.summary ?? '')}</div>
										</div>
									{/if}

									{#if meeting.highlights.length > 0}
										<div class="px-5 py-4">
											<p class="text-xs font-medium text-accent mb-3 uppercase tracking-wide">Key Moments</p>
											<div class="space-y-4">
												{#each meeting.highlights as h}
													<div class="border-l-2 border-accent/30 pl-3">
														<div class="flex items-start justify-between gap-4">
															<div class="min-w-0">
																<p class="text-text text-xs font-medium mb-1">{h.topic}</p>
																<p class="text-text/60 text-xs leading-relaxed italic">"{h.quote}"</p>
															</div>
															<a
																href={timestampUrl(meeting.youtube_url, h.timestamp_sec)}
																target="_blank"
																rel="noopener noreferrer"
																class="shrink-0 text-xs text-accent hover:underline whitespace-nowrap"
															>
																▶ {formatTimestamp(h.timestamp_sec)}
															</a>
														</div>
													</div>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{/each}

	{#if meetings.length === 0}
		<p class="text-muted text-sm">No meeting records available.</p>
	{/if}

</div>

<style>
	.post-body :global(h1), .post-body :global(h2), .post-body :global(h3) {
		font-weight: 700; color: #f0f0f0; margin: 1rem 0 0.5rem;
	}
	.post-body :global(p) { color: rgba(240,240,240,0.7); line-height: 1.7; margin-bottom: 0.75rem; }
	.post-body :global(strong) { color: #f0f0f0; }
	.post-body :global(ul), .post-body :global(ol) { color: rgba(240,240,240,0.7); padding-left: 1.5rem; margin-bottom: 0.75rem; line-height: 1.7; }
	.post-body :global(ul) { list-style-type: disc; }
	.post-body :global(ol) { list-style-type: decimal; }
</style>
