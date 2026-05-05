# DeYoung Disclosure — Site Requirements
## Last updated: 2026-05-05 (post approval pipeline added)

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

## Post Approval Pipeline (v2 — Cloudflare Workers)

The `/dave-post` skill generates drafts. This pipeline takes an approved draft from Steven's
hands and puts it in Dave's — one tap from Dave and it fires everywhere automatically.

### Post States

```
draft → pending_approval → approved → published
                        ↘ rejected
                        ↘ rejected_with_edits → (back to draft)
```

### Flow

1. **Steven runs `/dave-post`**, iterates on the draft, marks it ready
2. **Skill submits the post** to the Worker `/post/submit` endpoint (authenticated)
3. **Worker stores the post** in Cloudflare KV with state `pending_approval`
4. **Worker generates a signed approval link** and emails it to Dave
5. **Dave clicks the link** — sees a minimal preview page (post content, image, platform targets)
6. **Dave chooses:**
   - ✅ **Approve** → Worker fires Meta Graph API (FB + Instagram), creates Decap CMS entry, triggers Pages rebuild, marks post `published`
   - ❌ **Reject** → Post marked `rejected`, Steven notified
   - ✏️ **Reject with Edits** → Dave adds a note, post returns to `draft`, Steven notified with Dave's note
7. **Audit trail** — every state transition timestamped and stored in KV

### Worker Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/post/submit` | POST | Skill token (HMAC) | Receives draft from skill, stores in KV, sends approval email |
| `/api/post/approve` | GET | Signed token in URL | Dave's one-click approve — validates token, fires publish |
| `/api/post/reject` | POST | Signed token in URL | Dave rejects, optional note |
| `/api/post/status` | GET | Skill token | Check current state of a post by ID |

### Approval Link Security

- Each pending post gets a unique HMAC-SHA256 token signed with a server secret
- Token encodes: `post_id + expiry + action`
- Single-use — token is invalidated after Dave acts on it
- 7-day expiry — if Dave doesn't act, post stays in `pending_approval` for re-send

### Dave's Approval Page

- Minimal, mobile-friendly — loads fast on a phone tap from email
- Shows: post content, image preview, target platforms
- Three buttons: Approve / Reject / Reject with Edits
- No login required — the signed token in the URL is the auth
- Confirms action with a simple "Post sent!" or "Post rejected." screen

### Notifications

- Dave receives: email with approval link when a post is submitted
- Steven receives: email confirmation when Dave approves or rejects
- Future: SMS fallback for Dave if email link goes unopened after 24 hours

### Storage (Cloudflare KV)

```
posts:{id} → { content, image, platforms, state, created_at, updated_at, token, dave_note }
```

### Tech Stack Addition

| Concern | Solution |
|---------|----------|
| Worker runtime | Cloudflare Workers |
| State storage | Cloudflare KV |
| Email delivery | Resend (free tier, 3k/mo) |
| Token signing | Web Crypto API (built into Workers) |
| Social publish | Meta Graph API |
| CMS entry | Decap CMS via GitHub Contents API |

---

## Out of Scope (v1)

- X/Twitter integration (API cost not justified)
- Email newsletter
- Paid advertising
- E-commerce or donations
- User accounts (public-facing)
