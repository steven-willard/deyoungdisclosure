<script>
	import { enhance } from '$app/forms';

	let { data } = $props();
	let { pendingPosts, recentMessages, stats } = $derived(data);
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

					<p class="text-text/70 text-sm mb-4 line-clamp-3">{post.body}</p>

					{#if post.tags?.length}
						<div class="flex gap-2 flex-wrap mb-4">
							{#each post.tags as tag}
								<span class="px-2 py-0.5 text-xs rounded-full bg-accent/10 text-accent border border-accent/20">{tag}</span>
							{/each}
						</div>
					{/if}

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
