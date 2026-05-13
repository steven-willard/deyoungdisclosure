<script>
	let { data } = $props();
	let { posts } = $derived(data);

	const STATE_STYLES = {
		pending_approval: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
		published: 'bg-green-500/20 text-green-400 border-green-500/30',
		rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
	};

	const STATE_LABELS = {
		pending_approval: 'Pending',
		published: 'Published',
		rejected: 'Rejected',
	};
</script>

{#if posts.length === 0}
	<div class="bg-surface rounded-lg border border-white/10 p-12 text-center">
		<p class="text-muted text-sm">No posts yet. <a href="/admin/compose" class="text-accent hover:underline">Compose one →</a></p>
	</div>
{:else}
	<div class="space-y-3">
		{#each posts as post (post.id)}
			<div class="bg-surface rounded-lg border border-white/10 p-5">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0">
						<h3 class="font-heading font-semibold text-text truncate">{post.title}</h3>
						<p class="text-muted text-xs mt-1">
							{new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
							· {post.created_by}
							{#if post.platforms?.length}
								· {post.platforms.join(', ')}
							{/if}
						</p>
						{#if post.dave_note}
							<p class="text-text/50 text-xs mt-1 italic">Note: {post.dave_note}</p>
						{/if}
					</div>
					<span class="px-2 py-0.5 text-xs rounded-full border shrink-0 {STATE_STYLES[post.state] ?? 'bg-white/10 text-text/50 border-white/20'}">
						{STATE_LABELS[post.state] ?? post.state}
					</span>
				</div>

				{#if post.tags?.length}
					<div class="flex gap-2 flex-wrap mt-3">
						{#each post.tags as tag}
							<span class="px-2 py-0.5 text-xs rounded-full bg-accent/10 text-accent border border-accent/20">{tag}</span>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
