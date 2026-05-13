<script>
	import { page } from '$app/stores';

	let { children, data } = $props();

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: '⊞' },
		{ href: '/admin/compose', label: 'Compose', icon: '✏' },
		{ href: '/admin/posts', label: 'Posts', icon: '📋' },
		{ href: '/admin/inbox', label: 'Inbox', icon: '✉' }
	];

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/admin/login';
	}
</script>

<svelte:head>
	<title>Admin — DeYoung Disclosure</title>
</svelte:head>

<div class="min-h-screen bg-primary flex">
	<!-- Sidebar -->
	<aside class="w-56 bg-surface border-r border-white/10 flex flex-col shrink-0">
		<div class="px-5 py-5 border-b border-white/10">
			<p class="font-heading font-bold text-accent text-sm tracking-wide">DeYoung Admin</p>
		</div>
		<nav class="flex-1 py-4">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors
						{$page.url.pathname === item.href
							? 'text-accent bg-accent/10 border-r-2 border-accent'
							: 'text-text/60 hover:text-text hover:bg-white/5'}"
				>
					<span class="text-base">{item.icon}</span>
					{item.label}
				</a>
			{/each}
		</nav>
		{#if data?.user}
			<div class="px-5 py-4 border-t border-white/10">
				<p class="text-xs text-muted truncate mb-2">{data.user.email}</p>
				<button
					onclick={logout}
					class="text-xs text-red-400 hover:text-red-300 transition-colors"
				>
					Sign out
				</button>
			</div>
		{/if}
	</aside>

	<!-- Main content -->
	<div class="flex-1 flex flex-col min-w-0">
		<header class="h-14 bg-surface border-b border-white/10 flex items-center px-6">
			<h1 class="text-sm font-medium text-text/60">
				{#if $page.url.pathname === '/admin'}Dashboard
				{:else if $page.url.pathname === '/admin/compose'}Compose Post
				{:else if $page.url.pathname === '/admin/posts'}Post History
				{:else if $page.url.pathname === '/admin/inbox'}Contact Inbox
				{:else}Admin
				{/if}
			</h1>
		</header>
		<main class="flex-1 p-6 overflow-auto">
			{@render children()}
		</main>
	</div>
</div>
