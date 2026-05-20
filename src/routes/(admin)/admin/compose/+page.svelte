<script>
	import { enhance } from '$app/forms';
	import { marked } from 'marked';
	import removeMd from 'remove-markdown';

	let { form, data } = $props();
	const { meetings } = data;

	const PLATFORMS = ['Facebook', 'Instagram', 'Website'];

	// Body state for live preview
	let body = $state('');
	let preview = $derived(marked.parse(body));

	// Image URL for live preview
	let imageUrl = $state('');
	let imageError = $state(false);
	$effect(() => { imageError = false; });

	// Platform selection + social copy
	let selectedPlatforms = $state([]);
	let socialCopy = $state('');
	const showSocialCopy = $derived(
		selectedPlatforms.includes('Facebook') || selectedPlatforms.includes('Instagram')
	);
	function togglePlatform(platform) {
		if (selectedPlatforms.includes(platform)) {
			selectedPlatforms = selectedPlatforms.filter(p => p !== platform);
		} else {
			selectedPlatforms = [...selectedPlatforms, platform];
		}
	}

	// Meeting search
	let meetingSearch = $state('');
	let meetingTypeFilter = $state('All');
	let expandedMeeting = $state(null);

	const MEETING_TYPES = ['All', 'Board of Trustees', 'Planning Commission', 'Zoning Board of Appeals'];

	const filteredMeetings = $derived(
		meetings.filter(m => {
			const matchesType = meetingTypeFilter === 'All' || m.type === meetingTypeFilter;
			const matchesSearch = !meetingSearch ||
				m.date?.includes(meetingSearch) ||
				m.type.toLowerCase().includes(meetingSearch.toLowerCase()) ||
				m.highlights.some(h =>
					h.topic.toLowerCase().includes(meetingSearch.toLowerCase()) ||
					h.quote.toLowerCase().includes(meetingSearch.toLowerCase())
				);
			return matchesType && matchesSearch;
		})
	);

	// Textarea ref for cursor-position insertion
	let textarea;

	function insertAtCursor(text) {
		if (!textarea) return;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const before = body.slice(0, start);
		const after = body.slice(end);
		const newline = before.length && !before.endsWith('\n') ? '\n' : '';
		body = `${before}${newline}${text}\n${after}`;
		setTimeout(() => {
			textarea.focus();
			const pos = start + newline.length + text.length + 1;
			textarea.setSelectionRange(pos, pos);
		}, 0);
	}

	function wrapSelection(before, after = before, placeholder = 'text') {
		if (!textarea) return;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = body.slice(start, end) || placeholder;
		const replacement = `${before}${selected}${after}`;
		body = body.slice(0, start) + replacement + body.slice(end);
		setTimeout(() => {
			textarea.focus();
			if (body.slice(start, end)) {
				textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
			} else {
				// No selection — select the placeholder text
				textarea.setSelectionRange(start + before.length, start + before.length + placeholder.length);
			}
		}, 0);
	}

	function insertLinePrefix(prefix) {
		if (!textarea) return;
		const start = textarea.selectionStart;
		const lineStart = body.lastIndexOf('\n', start - 1) + 1;
		body = body.slice(0, lineStart) + prefix + body.slice(lineStart);
		setTimeout(() => {
			textarea.focus();
			const pos = lineStart + prefix.length;
			textarea.setSelectionRange(pos, pos);
		}, 0);
	}

	function insertCodeBlock() {
		if (!textarea) return;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = body.slice(start, end) || 'code here';
		const block = `\`\`\`js\n${selected}\n\`\`\``;
		body = body.slice(0, start) + block + body.slice(end);
		setTimeout(() => {
			textarea.focus();
			// Select the inner content
			const innerStart = start + 4; // after ```js\n
			textarea.setSelectionRange(innerStart, innerStart + selected.length);
		}, 0);
	}

	function insertHighlight(meeting, highlight) {
		const date = meeting.date ? new Date(meeting.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : meeting.type;
		const link = `${meeting.youtube_url}&t=${highlight.timestamp_sec}`;
		const md = `> "${highlight.quote}"\n> — [${meeting.type}, ${date}](${link})`;
		insertAtCursor(md);
	}

	function insertMeetingLink(meeting) {
		const date = meeting.date ? new Date(meeting.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : meeting.type;
		const md = `[${meeting.type} — ${date}](${meeting.youtube_url})`;
		insertAtCursor(md);
	}

	// Client-side validation
	let submitError = $state('');
	function handleSubmit(e) {
		if (showSocialCopy && !socialCopy.trim()) {
			e.preventDefault();
			submitError = 'Social copy is required when Facebook or Instagram is selected.';
			document.getElementById('social_copy')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		} else {
			submitError = '';
		}
	}

	function convertToSocialCopy() {
		socialCopy = removeMd(body, { replaceLinksWithURL: true });
	}

	const TOOLBAR = [
		{ label: 'B', title: 'Bold', action: () => wrapSelection('**', '**', 'bold text'), style: 'font-bold' },
		{ label: 'I', title: 'Italic', action: () => wrapSelection('*', '*', 'italic text'), style: 'italic' },
		{ label: 'H2', title: 'Heading 2', action: () => insertLinePrefix('## ') },
		{ label: 'H3', title: 'Heading 3', action: () => insertLinePrefix('### ') },
		{ label: '"', title: 'Blockquote', action: () => insertLinePrefix('> ') },
		{ label: '`', title: 'Inline code', action: () => wrapSelection('`', '`', 'code') },
		{ label: '{ }', title: 'Code block', action: insertCodeBlock },
		{ label: '🔗', title: 'Link', action: () => wrapSelection('[', '](https://)', 'link text') },
		{ label: '•', title: 'Bullet list', action: () => insertLinePrefix('- ') },
		{ label: '1.', title: 'Numbered list', action: () => insertLinePrefix('1. ') },
		{ label: '—', title: 'Horizontal rule', action: () => insertAtCursor('---') },
	];
</script>

{#if form?.error}
	<div class="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
		<p class="text-red-400 text-sm">{form.error}</p>
	</div>
{/if}

<div class="max-w-6xl space-y-6">
	{#if submitError}
		<div class="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
			<p class="text-red-400 text-sm">{submitError}</p>
		</div>
	{/if}

	<form method="POST" use:enhance onsubmit={handleSubmit} class="space-y-6">

		<!-- Title -->
		<div class="max-w-2xl">
			<label for="title" class="block text-sm font-medium text-text/70 mb-2">Title</label>
			<input
				id="title" name="title" type="text" required
				class="w-full bg-surface border border-white/20 rounded px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
				placeholder="Post title"
			/>
		</div>

		<!-- Body — split pane with toolbar below editor -->
		<div>
			<label class="block text-sm font-medium text-text/70 mb-2">Body</label>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<p class="text-xs text-muted mb-1">Markdown</p>
					<textarea
						bind:this={textarea}
						bind:value={body}
						name="body"
						required
						rows="16"
						class="w-full bg-surface border border-white/20 rounded px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors resize-y font-mono text-sm"
						placeholder="Post content — markdown supported..."
					></textarea>
					<!-- Toolbar -->
					<div class="flex flex-wrap gap-1 mt-2 p-2 bg-surface border border-white/10 rounded">
						{#each TOOLBAR as btn}
							<button
								type="button"
								title={btn.title}
								onclick={btn.action}
								class="px-2 py-1 rounded text-xs text-text/70 hover:bg-white/10 hover:text-text transition-colors font-mono {btn.style ?? ''}"
							>
								{btn.label}
							</button>
						{/each}
					</div>
				</div>
				<div>
					<p class="text-xs text-muted mb-1">Preview</p>
					<div class="bg-surface border border-white/10 rounded px-4 py-3 min-h-[calc(16*1.5rem+24px)] post-body text-sm overflow-auto">
						{#if body}
							{@html preview}
						{:else}
							<p class="text-muted text-xs">Preview will appear here...</p>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Tags -->
		<div class="max-w-2xl">
			<label for="tags" class="block text-sm font-medium text-text/70 mb-2">Tags <span class="text-muted font-normal">(comma-separated)</span></label>
			<input
				id="tags" name="tags" type="text"
				class="w-full bg-surface border border-white/20 rounded px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
				placeholder="Accountability, Transparency, FOIA"
			/>
		</div>

		<!-- Image URL + live preview -->
		<div class="max-w-2xl">
			<label for="image_url" class="block text-sm font-medium text-text/70 mb-2">Image URL <span class="text-muted font-normal">(optional)</span></label>
			<input
				id="image_url" name="image_url" type="url"
				bind:value={imageUrl}
				class="w-full bg-surface border border-white/20 rounded px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
				placeholder="https://..."
			/>
			{#if imageUrl && !imageError}
				<div class="mt-3 rounded-lg overflow-hidden border border-white/10 max-h-48">
					<img
						src={imageUrl}
						alt="Preview"
						class="w-full object-cover max-h-48"
						onerror={() => { imageError = true; }}
					/>
				</div>
			{:else if imageUrl && imageError}
				<p class="text-red-400 text-xs mt-2">Could not load image from that URL.</p>
			{/if}
		</div>

		<!-- Platforms -->
		<div class="max-w-2xl">
			<p class="block text-sm font-medium text-text/70 mb-3">Platforms</p>
			<div class="flex gap-4">
				{#each PLATFORMS as platform}
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox" name="platforms" value={platform}
							checked={selectedPlatforms.includes(platform)}
							onchange={() => togglePlatform(platform)}
							class="accent-accent w-4 h-4"
						/>
						<span class="text-sm text-text/80">{platform}</span>
					</label>
				{/each}
			</div>
		</div>

		<!-- Social Copy — shown when Facebook or Instagram is selected -->
		{#if showSocialCopy}
			<div class="max-w-2xl">
				<div class="flex items-baseline justify-between mb-1">
					<label for="social_copy" class="block text-sm font-medium text-text/70">
						Social Copy
						<span class="text-muted font-normal">(plain text — sent to Facebook/Instagram)</span>
					</label>
					{#if body.trim()}
						<button
							type="button"
							onclick={convertToSocialCopy}
							class="text-xs text-accent hover:underline shrink-0 ml-4"
						>
							Convert from markdown
						</button>
					{/if}
				</div>
				<p class="text-xs text-muted mb-2">No markdown. Instagram max 2,200 characters. Required when posting to Facebook or Instagram.</p>
				<textarea
					id="social_copy" name="social_copy"
					bind:value={socialCopy}
					rows="6"
					class="w-full bg-surface border rounded px-4 py-3 text-text placeholder-muted focus:outline-none transition-colors resize-y text-sm
						{!socialCopy.trim() ? 'border-red-500/40 focus:border-red-500' : 'border-white/20 focus:border-accent'}"
					placeholder="Write the plain-text version for social platforms..."
				></textarea>
				<div class="flex justify-between mt-1">
					{#if !socialCopy.trim()}
						<p class="text-red-400 text-xs">Required for Facebook/Instagram.</p>
					{:else}
						<span></span>
					{/if}
					<p class="text-xs text-muted">{socialCopy.length} / 2,200</p>
				</div>
			</div>
		{/if}

		<!-- Submit -->
		<div class="pt-2">
			<button type="submit" class="px-8 py-3 bg-accent text-primary font-heading font-bold rounded text-sm tracking-wide hover:brightness-110 transition-all">
				Submit for Approval
			</button>
			<p class="text-muted text-xs mt-2">Post will appear in the dashboard for Dave to approve before publishing.</p>
		</div>
	</form>

	<!-- Meeting Reference Panel -->
	<div class="border-t border-white/10 pt-6">
		<p class="text-sm font-medium text-text/70 mb-4">Insert Meeting Reference</p>

		<div class="flex gap-3 mb-4">
			<input
				bind:value={meetingSearch}
				type="text"
				placeholder="Search by date, topic, or keyword..."
				class="flex-1 bg-surface border border-white/20 rounded px-3 py-2 text-text text-sm placeholder-muted focus:outline-none focus:border-accent transition-colors"
			/>
			<select
				bind:value={meetingTypeFilter}
				class="bg-surface border border-white/20 rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-accent transition-colors"
			>
				{#each MEETING_TYPES as type}
					<option value={type}>{type}</option>
				{/each}
			</select>
		</div>

		{#if filteredMeetings.length === 0}
			<p class="text-muted text-xs">No meetings match.</p>
		{:else}
			<div class="space-y-2 max-h-96 overflow-y-auto pr-1">
				{#each filteredMeetings as meeting}
					<div class="bg-surface border border-white/10 rounded-lg overflow-hidden">
						<div
							role="button" tabindex="0"
							onclick={() => expandedMeeting = expandedMeeting === meeting.video_id ? null : meeting.video_id}
							onkeydown={(e) => e.key === 'Enter' && (expandedMeeting = expandedMeeting === meeting.video_id ? null : meeting.video_id)}
							class="w-full text-left px-4 py-3 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer"
						>
							<div>
								<span class="text-text text-sm font-medium">{meeting.type}</span>
								<span class="text-muted text-xs ml-2">{meeting.date ?? ''}</span>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								<button
									type="button"
									onclick={(e) => { e.stopPropagation(); insertMeetingLink(meeting); }}
									class="text-accent text-xs hover:underline"
								>
									Insert link
								</button>
								<span class="text-muted text-xs">{expandedMeeting === meeting.video_id ? '▲' : '▼'}</span>
							</div>
						</div>

						{#if expandedMeeting === meeting.video_id}
							<div class="border-t border-white/10 divide-y divide-white/5">
								{#each meeting.highlights as highlight}
									<div class="px-4 py-3 flex items-start justify-between gap-4">
										<div class="min-w-0">
											<p class="text-accent text-xs font-medium mb-1">{highlight.topic}</p>
											<p class="text-text/70 text-xs leading-relaxed line-clamp-2">"{highlight.quote}"</p>
										</div>
										<button
											type="button"
											onclick={() => insertHighlight(meeting, highlight)}
											class="shrink-0 text-xs px-2 py-1 border border-accent/40 text-accent rounded hover:bg-accent/10 transition-colors"
										>
											Insert
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.post-body :global(h1), .post-body :global(h2), .post-body :global(h3) {
		font-weight: 700; color: #f0f0f0; margin: 1rem 0 0.5rem;
	}
	.post-body :global(p) { color: rgba(240,240,240,0.8); line-height: 1.7; margin-bottom: 1rem; }
	.post-body :global(strong) { color: #f0f0f0; }
	.post-body :global(a) { color: #c9a84c; text-decoration: underline; }
	.post-body :global(ul), .post-body :global(ol) { color: rgba(240,240,240,0.8); padding-left: 1.5rem; margin-bottom: 1rem; line-height: 1.7; }
	.post-body :global(ul) { list-style-type: disc; }
	.post-body :global(ol) { list-style-type: decimal; }
	.post-body :global(blockquote) {
		border-left: 3px solid #c9a84c; margin: 1rem 0;
		padding: 0.25rem 1rem; color: rgba(240,240,240,0.6); font-style: italic;
	}
	.post-body :global(code) { background: rgba(255,255,255,0.08); padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.8rem; font-family: monospace; }
	.post-body :global(pre) { background: rgba(255,255,255,0.05); padding: 0.75rem 1rem; border-radius: 6px; overflow-x: auto; margin-bottom: 1rem; }
	.post-body :global(pre code) { background: none; padding: 0; }
</style>
