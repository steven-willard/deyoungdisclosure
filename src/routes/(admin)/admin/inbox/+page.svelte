<script>
	let { data } = $props();
	let { messages } = $derived(data);
	let expanded = $state(new Set());

	function toggle(id) {
		const next = new Set(expanded);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expanded = next;
	}
</script>

{#if messages.length === 0}
	<div class="bg-surface rounded-lg border border-white/10 p-12 text-center">
		<p class="text-muted text-sm">No messages yet.</p>
	</div>
{:else}
	<div class="space-y-3">
		{#each messages as msg (msg.id)}
			<div class="bg-surface rounded-lg border border-white/10">
				<button
					onclick={() => toggle(msg.id)}
					class="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
				>
					<div class="min-w-0">
						<p class="font-medium text-text text-sm">{msg.name}</p>
						<p class="text-muted text-xs truncate">{msg.email}</p>
					</div>
					<div class="flex items-center gap-3 shrink-0">
						<p class="text-muted text-xs">{new Date(msg.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
						<span class="text-muted text-xs">{expanded.has(msg.id) ? '▲' : '▼'}</span>
					</div>
				</button>
				{#if expanded.has(msg.id)}
					<div class="px-5 pb-5 border-t border-white/10 pt-4">
						<p class="text-text/80 text-sm whitespace-pre-wrap">{msg.message}</p>
						<a
							href="mailto:{msg.email}"
							class="inline-block mt-4 text-accent text-sm hover:underline"
						>
							Reply to {msg.email} →
						</a>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
