<script>
	import { enhance } from '$app/forms';
	import { marked } from 'marked';

	let { data } = $props();
	let { pendingPosts, recentMessages, stats, isOwner } = $derived(data);
</script>

<!-- Stats row -->
<div class="grid grid-cols-3 gap-4 mb-8">
	<div class="bg-surface rounded-lg border border-white/10 p-4">
		<p class="text-muted text-xs mb-1">Pending Approval</p>
		<p class="font-heading text-3xl font-bold text-accent">{stats.totalPending}</p>
	</div>
	<div class="bg-surface rounded-lg border border-white/10 p-4">
		<p class="text-muted text-xs mb-1">Published Posts</p>
		<p class="font-heading text-3xl font-bold text-text">{stats.totalPublished}</p>
	</div>
	<div class="bg-surface rounded-lg border border-white/10 p-4">
		<p class="text-muted text-xs mb-1">Inbox Messages</p>
		<p class="font-heading text-3xl font-bold text-text">{stats.totalMessages}</p>
	</div>
</div>

<!-- Pending approvals -->
<div class="mb-8">
	<h2 class="font-heading text-lg font-bold text-text mb-4">Pending Approval</h2>

	{#if pendingPosts.length === 0}
		<div class="bg-surface rounded-lg border border-white/10 p-8 text-center">
			<p class="text-muted text-sm">No posts awaiting approval.</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each pendingPosts as post (post.id)}
				<div class="bg-surface rounded-lg border border-white/10 p-5">
					<!-- Image preview -->
					{#if post.image_url}
						<img src={post.image_url} alt={post.title} class="w-full rounded-lg mb-4 object-cover max-h-56" />
					{/if}

					<div class="flex items-start justify-between gap-4 mb-3">
						<div>
							<h3 class="font-heading font-semibold text-text">{post.title}</h3>
							<p class="text-muted text-xs mt-1">
								By {post.created_by} · {new Date(post.created_at).toLocaleDateString()}
								{#if post.platforms?.length}
									· {post.platforms.join(', ')}
								{/if}
							</p>
						</div>
						<span class="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shrink-0">
							Pending
						</span>
					</div>

					<!-- Markdown-rendered body -->
					<div class="post-body text-sm mb-4 max-h-64 overflow-y-auto border-t border-white/5 pt-3">
						{@html marked.parse(post.body ?? '')}
					</div>

					{#if post.tags?.length}
						<div class="flex gap-2 flex-wrap mb-4">
							{#each post.tags as tag}
								<span class="px-2 py-0.5 text-xs rounded-full bg-accent/10 text-accent border border-accent/20">{tag}</span>
							{/each}
						</div>
					{/if}

					{#if isOwner}
						<div class="flex gap-3">
							<form method="POST" action="?/approve" use:enhance class="flex gap-2 flex-1">
								<input type="hidden" name="postId" value={post.id} />
								<input
									type="text"
									name="note"
									placeholder="Optional note..."
									class="flex-1 bg-primary border border-white/10 rounded px-3 py-1.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
								/>
								<button
									type="submit"
									class="px-4 py-1.5 bg-accent text-primary font-heading font-bold rounded text-xs tracking-wide hover:brightness-110 transition-all"
								>
									Approve
								</button>
							</form>
							<form method="POST" action="?/reject" use:enhance>
								<input type="hidden" name="postId" value={post.id} />
								<button
									type="submit"
									class="px-4 py-1.5 border border-red-500/40 text-red-400 rounded text-xs font-medium hover:bg-red-500/10 transition-all"
								>
									Reject
								</button>
							</form>
						</div>
					{:else}
						<p class="text-muted text-xs">Awaiting Dave's approval.</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Recent inbox preview -->
{#if recentMessages.length > 0}
	<div>
		<div class="flex items-center justify-between mb-4">
			<h2 class="font-heading text-lg font-bold text-text">Recent Messages</h2>
			<a href="/admin/inbox" class="text-accent text-sm hover:underline">View all →</a>
		</div>
		<div class="space-y-3">
			{#each recentMessages as msg}
				<div class="bg-surface rounded-lg border border-white/10 p-4">
					<div class="flex items-center justify-between mb-1">
						<p class="font-medium text-text text-sm">{msg.name}</p>
						<p class="text-muted text-xs">{new Date(msg.created_at).toLocaleDateString()}</p>
					</div>
					<p class="text-muted text-xs mb-2">{msg.email}</p>
					<p class="text-text/60 text-sm line-clamp-2">{msg.message}</p>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.post-body :global(h1), .post-body :global(h2), .post-body :global(h3) {
		font-weight: 700; color: #f0f0f0; margin: 0.75rem 0 0.4rem;
	}
	.post-body :global(p) { color: rgba(240,240,240,0.8); line-height: 1.7; margin-bottom: 0.75rem; }
	.post-body :global(strong) { color: #f0f0f0; }
	.post-body :global(em) { color: rgba(240,240,240,0.7); }
	.post-body :global(a) { color: #c9a84c; text-decoration: underline; }
	.post-body :global(ul), .post-body :global(ol) { color: rgba(240,240,240,0.8); padding-left: 1.5rem; margin-bottom: 0.75rem; line-height: 1.7; }
	.post-body :global(ul) { list-style-type: disc; }
	.post-body :global(ol) { list-style-type: decimal; }
	.post-body :global(blockquote) {
		border-left: 3px solid #c9a84c; margin: 0.75rem 0;
		padding: 0.25rem 1rem; color: rgba(240,240,240,0.6); font-style: italic;
	}
	.post-body :global(code) { background: rgba(255,255,255,0.08); padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.8rem; font-family: monospace; }
	.post-body :global(pre) { background: rgba(255,255,255,0.05); padding: 0.75rem 1rem; border-radius: 6px; overflow-x: auto; margin-bottom: 0.75rem; }
	.post-body :global(pre code) { background: none; padding: 0; }
</style>
