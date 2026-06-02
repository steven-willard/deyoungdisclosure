<script>
	import '../../app.css';
	import { page } from '$app/stores';

	let { children } = $props();

	const navLinks = [
		{ href: '/', label: 'Home' },
		{ href: '/posts', label: 'Posts' },
		{ href: '/meetings', label: 'Meetings' },
		{ href: '/about', label: 'About' },
		{ href: '/contact', label: 'Contact' }
	];

	let mobileOpen = $state(false);

	function isActive(href) {
		return $page.url.pathname === href || ($page.url.pathname.startsWith(href) && href !== '/');
	}

	// Subscribe form
	let subEmail = $state('');
	let subMessage = $state('');
	let subLoading = $state(false);

	async function handleSubscribe(e) {
		e.preventDefault();
		if (subLoading) return;
		subLoading = true;
		subMessage = '';
		try {
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: subEmail })
			});
			const data = await res.json();
			if (data.ok) {
				subEmail = '';
				subMessage = data.already
					? 'You\u2019re already subscribed!'
					: 'Check your email to confirm your subscription.';
			} else {
				subMessage = data.error || 'Something went wrong. Please try again.';
			}
		} catch {
			subMessage = 'Something went wrong. Please try again.';
		} finally {
			subLoading = false;
		}
	}
</script>

<div class="min-h-screen flex flex-col bg-primary text-text">

	<!-- Nav -->
	<header class="sticky top-0 z-50 border-b border-white/10" style="background: linear-gradient(135deg, #060f1a 0%, #0f1f2e 50%, #0a1520 100%);">
		<nav class="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
			<a href="/" class="font-heading font-bold text-lg tracking-wide shrink-0" style="background: linear-gradient(90deg, #c9a84c, #f0d080); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
				Dave DeYoung
			</a>

			<!-- Desktop links -->
			<ul class="hidden sm:flex items-center gap-6">
				{#each navLinks as link}
					<li>
						<a
							href={link.href}
							class="text-sm font-medium transition-colors hover:text-accent
								{isActive(link.href) ? 'text-accent' : 'text-text/70'}"
						>
							{link.label}
						</a>
					</li>
				{/each}
			</ul>

			<!-- Mobile hamburger -->
			<button
				type="button"
				class="sm:hidden text-text/70 hover:text-text transition-colors p-1"
				aria-label="Toggle menu"
				onclick={() => mobileOpen = !mobileOpen}
			>
				{#if mobileOpen}
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				{/if}
			</button>
		</nav>

		<!-- Mobile dropdown -->
		{#if mobileOpen}
			<div class="sm:hidden border-t border-white/10 px-6 py-3" style="background: linear-gradient(135deg, #060f1a 0%, #0f1f2e 100%);">
				<ul class="flex flex-col gap-1">
					{#each navLinks as link}
						<li>
							<a
								href={link.href}
								onclick={() => mobileOpen = false}
								class="block py-2.5 text-sm font-medium transition-colors hover:text-accent
									{isActive(link.href) ? 'text-accent' : 'text-text/70'}"
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</header>

	<!-- Page content -->
	<main class="flex-1">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="bg-surface border-t border-white/10 mt-20">
		<div class="max-w-5xl mx-auto px-6 py-12">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">

				<!-- Tagline -->
				<div class="md:col-span-2">
					<p class="font-heading text-xl font-bold text-accent leading-snug">
						I serve the people.<br>Not the institution.
					</p>
					<p class="text-muted text-sm mt-3 max-w-md">
						Views expressed are those of Dave DeYoung personally and do not represent
						Holland Charter Township or any other government body.
					</p>
				</div>

				<!-- Links + Social -->
				<div class="flex flex-col gap-4">
					<ul class="flex flex-wrap gap-x-4 gap-y-2">
						{#each navLinks as link}
							<li>
								<a href={link.href} class="text-sm text-muted hover:text-accent transition-colors">
									{link.label}
								</a>
							</li>
						{/each}
					</ul>
					<div class="flex gap-4">
						<!-- Facebook -->
						<a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
							class="text-muted hover:text-accent transition-colors" aria-label="Facebook">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
							</svg>
						</a>
						<!-- Instagram -->
						<a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
							class="text-muted hover:text-accent transition-colors" aria-label="Instagram">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
							</svg>
						</a>
					</div>
				</div>

			</div>
			<!-- Subscribe -->
		<div class="mt-8 pt-6 border-t border-white/10">
			<p class="text-sm text-muted mb-3">Get notified when Dave publishes a new post.</p>
			<form onsubmit={handleSubscribe} class="flex flex-col sm:flex-row gap-2 max-w-sm">
				<input
					type="email"
					placeholder="your@email.com"
					bind:value={subEmail}
					required
					class="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
				/>
				<button
					type="submit"
					disabled={subLoading}
					class="px-4 py-2 bg-accent text-primary text-sm font-semibold rounded hover:bg-accent/90 transition-colors disabled:opacity-50 whitespace-nowrap"
				>
					{subLoading ? 'Sending\u2026' : 'Subscribe'}
				</button>
			</form>
			{#if subMessage}
				<p class="text-sm mt-2 {subMessage.startsWith('Check') || subMessage.includes('already') ? 'text-accent' : 'text-red-400'}">
					{subMessage}
				</p>
			{/if}
		</div>

		<p class="text-muted text-xs mt-8 border-t border-white/10 pt-6">
				© {new Date().getFullYear()} Dave DeYoung · Holland Charter Township Trustee · deyoungdisclosure.com
				<span class="block mt-1 text-white/20">Built and maintained by Steven Willard II, Holland Township resident</span>
			</p>
		</div>
	</footer>

</div>
