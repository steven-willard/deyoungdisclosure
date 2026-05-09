<script>
	const {
		title = 'Dave DeYoung | HCT Trustee',
		description = 'Transparency from an elected trustee. Dave DeYoung, Holland Charter Township Trustee — accountability, transparency, and civic leadership.',
		image = 'https://deyoungdisclosure.com/og-default.jpg',
		url = 'https://deyoungdisclosure.com',
		type = 'website'
	} = $props();

	const fullTitle = title.includes('Dave DeYoung') ? title : `${title} | Dave DeYoung`;
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />

	<!-- Open Graph -->
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />
	<meta property="og:url" content={url} />
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content="DeYoung Disclosure" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
</svelte:head>
