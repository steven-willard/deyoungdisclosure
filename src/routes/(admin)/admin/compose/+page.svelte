<script>
	import { enhance } from '$app/forms';

	let { form } = $props();

	const PLATFORMS = ['Facebook', 'Instagram', 'Website'];
</script>

{#if form?.error}
	<div class="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
		<p class="text-red-400 text-sm">{form.error}</p>
	</div>
{/if}

<form method="POST" use:enhance class="max-w-2xl space-y-6">
	<div>
		<label for="title" class="block text-sm font-medium text-text/70 mb-2">Title</label>
		<input
			id="title"
			name="title"
			type="text"
			required
			class="w-full bg-surface border border-white/20 rounded px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
			placeholder="Post title"
		/>
	</div>

	<div>
		<label for="body" class="block text-sm font-medium text-text/70 mb-2">Body</label>
		<textarea
			id="body"
			name="body"
			required
			rows="12"
			class="w-full bg-surface border border-white/20 rounded px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors resize-y font-mono text-sm"
			placeholder="Post content..."
		></textarea>
	</div>

	<div>
		<label for="tags" class="block text-sm font-medium text-text/70 mb-2">Tags <span class="text-muted font-normal">(comma-separated)</span></label>
		<input
			id="tags"
			name="tags"
			type="text"
			class="w-full bg-surface border border-white/20 rounded px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
			placeholder="Accountability, Transparency, FOIA"
		/>
	</div>

	<div>
		<label for="image_url" class="block text-sm font-medium text-text/70 mb-2">Image URL <span class="text-muted font-normal">(optional)</span></label>
		<input
			id="image_url"
			name="image_url"
			type="url"
			class="w-full bg-surface border border-white/20 rounded px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
			placeholder="https://..."
		/>
	</div>

	<div>
		<p class="block text-sm font-medium text-text/70 mb-3">Platforms</p>
		<div class="flex gap-4">
			{#each PLATFORMS as platform}
				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						name="platforms"
						value={platform}
						class="accent-accent w-4 h-4"
					/>
					<span class="text-sm text-text/80">{platform}</span>
				</label>
			{/each}
		</div>
	</div>

	<div class="pt-2">
		<button
			type="submit"
			class="px-8 py-3 bg-accent text-primary font-heading font-bold rounded text-sm tracking-wide hover:brightness-110 transition-all"
		>
			Submit for Approval
		</button>
		<p class="text-muted text-xs mt-2">Post will appear in the dashboard for Dave to approve before publishing.</p>
	</div>
</form>
