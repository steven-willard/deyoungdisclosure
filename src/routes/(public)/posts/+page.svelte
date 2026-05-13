<script>
	import SEO from '$lib/SEO.svelte';
</script>

<SEO
	title="Posts & Disclosures"
	description="Every public statement, post, and disclosure from Dave DeYoung, Holland Charter Township Trustee. Permanent archive — nothing gets buried."
	url="https://deyoungdisclosure.com/posts"
/>

<div class="max-w-5xl mx-auto px-6 py-16">
	<div class="mb-12">
		<p class="text-accent text-xs font-medium tracking-widest uppercase mb-2">Archive</p>
		<h1 class="font-heading text-4xl font-bold text-text mb-3">Posts & Disclosures</h1>
		<p class="text-text/60 max-w-xl">
			Every post lives here permanently. Nothing gets buried in a feed.
		</p>
	</div>

	<!-- Tag filters — populated dynamically once CMS is wired -->
	<div class="flex gap-2 flex-wrap mb-10">
		{#each ['All', 'Accountability', 'Transparency', 'Community', 'FOIA'] as tag}
			<button class="px-3 py-1 text-xs font-medium rounded-full border border-white/20 text-muted hover:border-accent hover:text-accent transition-colors">
				{tag}
			</button>
		{/each}
	</div>

	<!-- Posts grid placeholder -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		<div class="bg-surface rounded-lg border border-white/10 p-8 text-center col-span-full">
			<p class="text-muted text-sm">Posts will appear here once the CMS is connected.</p>
		</div>
	</div>
</div>
