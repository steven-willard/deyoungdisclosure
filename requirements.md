# DeYoung Disclosure — Site Requirements
## Last updated: 2026-05-05

---

## Overview

A civic transparency website for **Dave DeYoung**, Holland Charter Township Trustee.
Site lives at **deyoungdisclosure.com**.

### Purpose
- Permanent, searchable archive of Dave's public statements and posts
- Cross-posting hub: one publish action reaches Facebook and Instagram simultaneously
- Establishes Dave as a credible, accessible elected official with a clear civic voice

---

## Functional Requirements

### 1. Landing Page
- Hero section: Dave's name, title, tagline
- Brief bio — who he is, why he serves
- Links to Facebook and Instagram
- Call to action (contact Dave, read recent posts)

### 2. Post Archive (Blog)
- Chronological list of all published posts
- Individual post pages with full content
- Tag/category filtering
- Shareable URLs for every post (permanent links)

### 3. Cross-Posting (Admin)
- Single publish action sends to Facebook and Instagram simultaneously
- Image upload support
- Draft/preview before publishing
- Post saved to site archive automatically on publish

### 4. Admin Panel (Decap CMS)
- Password-protected
- Two admin users: Dave DeYoung and Steven Willard
- Dave can publish without any code knowledge
- Rich text editor with image support
- Front matter fields: title, description, date, image, tags

### 5. Contact
- Simple contact form or direct email link
- No phone number displayed publicly

---

## Technical Requirements

| Concern | Solution |
|---------|----------|
| Framework | SvelteKit |
| Hosting | Cloudflare Pages (free tier) |
| CMS | Decap CMS (Git-based, no backend) |
| Adapter | `@sveltejs/adapter-cloudflare` |
| Social API | Meta Graph API (Facebook + Instagram) |
| Domain | deyoungdisclosure.com (Namecheap) |
| Images | Cloudflare Images or static `/static` folder |

---

## SEO Requirements

### Target Keywords & Search Intents

| Intent | Target Keywords |
|--------|----------------|
| Name search | "Dave DeYoung", "Dave DeYoung Holland Michigan", "Dave DeYoung trustee" |
| Role search | "Holland Charter Township trustee", "HCT trustee", "Holland Township board member" |
| Issue search | "Holland Township code enforcement", "HCT selective enforcement", "Holland Township transparency" |
| Civic search | "Holland MI elected official", "Holland Charter Township accountability" |
| Local community | "Holland Michigan civic", "Holland MI local government", "Ottawa County trustee" |
| Personal brand | "Dave DeYoung motivational speaker", "Dave DeYoung real estate Holland MI" |

### On-Page SEO
- Unique `<title>` and `<meta name="description">` on every page and post
- Open Graph tags on all pages (Facebook/Instagram rich previews)
- Twitter Card tags (for link sharing even outside X/Twitter)
- Canonical URLs on all pages
- JSON-LD structured data:
  - `Person` schema on homepage (Dave's name, role, location, social profiles)
  - `BlogPosting` schema on each post (title, date, author, description, image)
  - `WebSite` schema with `SearchAction` for sitelinks search box

### Technical SEO
- SSR/SSG via Cloudflare Pages — all pages deliver real HTML to crawlers
- `static/robots.txt` — allow all crawlers, reference sitemap
- `src/routes/sitemap.xml/+server.js` — dynamic XML sitemap, auto-updates on new posts
- Semantic HTML: `<article>`, `<nav>`, `<header>`, `<main>`, `<footer>`, `<time datetime="...">`
- Image `alt` text required on all images (Decap CMS field)
- Mobile-first responsive layout — Core Web Vitals target: all green
- HTTPS enforced via Cloudflare

### Content SEO
- Every post has: title, meta description, OG image, publish date, tags
- Homepage includes Dave's full name, title, location (Holland, Michigan)
- About/bio section uses natural language with target terms (not stuffed)
- Internal linking: posts link back to homepage, related posts link to each other
- External links to Dave's official township profile and social accounts

---

## Brand Direction

- **Tone:** Bold, direct, aspirational — a civic leader who holds the line
- **Themes:** Strength, accountability, transparency
- **Audience:** Holland Charter Township residents, local Facebook/Nextdoor communities
- **What this is not:** A complaint site, a campaign attack site, or a legal filing

---

## Out of Scope (v1)

- X/Twitter integration (API cost not justified)
- Email newsletter
- Paid advertising
- E-commerce or donations
- User accounts (public-facing)
