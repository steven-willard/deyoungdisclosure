<script>
	import SEO from '$lib/SEO.svelte';
</script>

<SEO
	title="About Dave DeYoung"
	description="Dave DeYoung is a Holland Charter Township Trustee, 27-year real estate veteran, and civic leader committed to transparency and accountability in Holland, Michigan."
	url="https://deyoungdisclosure.com/about"
/>

<div class="max-w-5xl mx-auto px-6 py-16">

	<!-- Header -->
	<div class="mb-16">
		<p class="text-accent text-xs font-medium tracking-widest uppercase mb-2">About</p>
		<h1 class="font-heading text-4xl font-bold text-text">Dave DeYoung</h1>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-12">

		<!-- Photo + contact -->
		<div class="md:col-span-1">
			<div class="aspect-[3/4] bg-surface rounded-lg border border-white/10 overflow-hidden mb-6">
				<img
					src="https://photos.listingstoleads.com/member_assets/photo/1682712050.jpg"
					alt="Dave DeYoung — Holland Charter Township Trustee"
					class="w-full h-full object-cover object-top"
				/>
			</div>
			<div class="space-y-2">
				<p class="text-text font-medium">Dave DeYoung</p>
				<p class="text-muted text-sm">Holland Charter Township Trustee</p>
				<a href="mailto:dave@davedeyoung.com"
					class="block text-accent text-sm hover:underline mt-3">
					dave@davedeyoung.com
				</a>
				<a href="tel:6162186699"
					class="block text-accent text-sm hover:underline">
					(616) 218-6699
				</a>
			</div>
		</div>

		<!-- Bio -->
		<div class="md:col-span-2 space-y-8">

			<div>
				<h2 class="font-heading text-2xl font-bold text-accent mb-4">
					I serve the people. Not the institution.
				</h2>
				<p class="text-text/80 leading-relaxed">
					I never planned on running for public office. But when you watch your township selectively
					enforce its own rules — protecting some while targeting others — you have two choices:
					accept it, or do something about it.
				</p>
				<p class="text-text/80 leading-relaxed mt-4">
					I chose to do something about it. I joined the Holland Charter Township board to promote
					transparency and accountability — not to protect the government, but to serve the people
					who live here.
				</p>
			</div>

			<div>
				<h2 class="font-heading text-xl font-bold text-text mb-4">Professional Background</h2>
				<p class="text-text/80 leading-relaxed">
					I've spent 27+ years in West Michigan real estate, earning the Coldwell Banker Diamond Society
					distinction and recognition as a Top Producer for 13 consecutive years. Nearly 96% of my clients
					return or refer me — because trust is something you build through consistent action, not empty words.
				</p>
				<p class="text-text/80 leading-relaxed mt-4">
					That same standard applies to public service.
				</p>
			</div>

			<!-- Credentials -->
			<div class="grid grid-cols-2 gap-4">
				{#each [
					{ label: 'Years in Real Estate', value: '27+' },
					{ label: 'Top Producer', value: '13 Years' },
					{ label: 'Client Return Rate', value: '96%' },
					{ label: 'Designation', value: 'Diamond Society' }
				] as stat}
					<div class="bg-surface rounded-lg border border-white/10 p-4">
						<p class="text-accent font-heading text-2xl font-bold">{stat.value}</p>
						<p class="text-muted text-xs mt-1">{stat.label}</p>
					</div>
				{/each}
			</div>

		</div>
	</div>
</div>
