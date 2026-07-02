# MegCMusic — Project Brief
**Client:** Meghan Clarisse Cave  
**Domain:** megcmusic.com (in-place replacement)  
**Status:** Pre-Gate 1 — awaiting Concept approval  
**Last updated:** 2026-06-16

---

## Purpose

Replace the existing WordPress/Storefront theme with a headless architecture and a
fully custom front-end. The site is Meghan's primary professional presence: booking
tool, show calendar, merch store, press resource, and fan hub. The redesign makes
the existing design (Figma file 908TLdOM0e6xRtnzOj2nNv) real, and brings the
studio motion vocabulary (GSAP, Three.js) to an artist site that currently has none.

---

## Architecture decisions (locked)

| Decision | Choice | Reason |
|---|---|---|
| Front-end | Next.js (App Router, ISR) | Studio default; enables GSAP/Three.js/Framer Motion; ISR handles dynamic data (shows, products) — static export explicitly out as it disables ISR |
| CMS / ecom backend | WordPress + WooCommerce (existing Bluehost install) | Products, PayPal, Events Calendar already configured — no migration |
| Data layer | WP REST API + WooCommerce REST API + The Events Calendar REST API | All three are active on the existing install |
| Checkout | Full custom Next.js cart → WooCommerce REST checkout | Seamless UX; no redirect break |
| Instagram feed | Behold (behold.so) free tier | Auto-refreshes OAuth token; feed endpoint consumed by Next.js at build + revalidate |
| Shows CMS | The Events Calendar (existing WP plugin) | Meg already manages shows here |
| Show quick-entry | Zapier: email/SMS → draft event in The Events Calendar | PC-compatible; one-time setup; Meg reviews and publishes from WP dashboard |
| Motion | GSAP (ScrollTrigger for scroll scenes) + Three.js (WebGL atmosphere) | Studio first-class vocabulary; both required on flagship surfaces |
| Hosting — front-end | Vercel | Static export + ISR for dynamic data |
| Hosting — WP backend | Bluehost (existing) | No change; accessed via REST only |
| Domain | megcmusic.com stays | Vercel serves front-end at megcmusic.com; Next.js calls megcmusic.com/wp-json/... directly — no subdomain needed |
| Styling | CSS custom properties + CSS Modules | Studio default; Tailwind explicitly out |

---

## Design system (from Figma)

**Figma file:** https://www.figma.com/design/908TLdOM0e6xRtnzOj2nNv/MegCMusic  
**Source of truth:** Sandbox page  
**Production page:** to be created at Sprint 1 merge

### Token map

```
/* Backgrounds */
--mc-bg:           #241420   /* deep plum — page ground */
--mc-bg-card:      #f7eadd   /* warm cream — show cards, light surfaces */
--mc-bg-section:   #291724   /* footer, slightly lighter plum */
--mc-bg-quote:     #331f2e   /* blockquote background */
--mc-divider:      #3f3119   /* section rule color */

/* Text */
--mc-text-primary:  #e5dcd3  /* warm cream — headings, primary body */
--mc-text-body:     #e5d0bc  /* slightly warmer — long-form body copy */
--mc-text-muted:    #caa45f  /* gold — captions, labels, secondary */
--mc-text-card:     #4f2c3d  /* dark plum — text on light card backgrounds */

/* Accents */
--mc-accent-pink:   #f6849a  /* primary accent: nav pill, active tab, CTAs */
--mc-accent-rose:   #c38b96  /* secondary: star motifs, dividers */
--mc-accent-blush:  #d6abb3  /* inactive tabs, Instagram band background */
--mc-accent-gold:   #caa45f  /* gold: attribution, secondary labels */
--mc-accent-red:    #d13e5b  /* venue name on show cards */

/* Typography */
--mc-font-display:  'Lora', serif           /* headings, section labels, drop cap context */
--mc-font-ui:       'Open Sans', sans-serif /* nav, tabs, labels, metadata */
--mc-font-drop-cap: 'Praise', cursive       /* single drop cap on bio section */
--mc-font-video:    'Newsreader', serif     /* video sidebar titles */
```

### Motif system

- **Guitar pick SVG** — rotated ~-96deg, used as decorative overlay behind date
  numbers on show cards and as large section background elements
- **★★★ LABEL ★★★** — section header pattern; stars in `--mc-accent-rose`,
  label text in `--mc-text-primary`, font Lora Bold 16px
- **Nav pill** — floating `#f6849a` rounded pill, top-right, Home underlined with
  `#fffcdb` bottom border when active
- **Show card** — `#f7eadd` background, `drop-shadow(0px 8px 18px rgba(0,0,0,0.55))`,
  8px radius, date in Lora with guitar pick behind it, venue in `#d13e5b`
- **Tab pills** — active: `#f6849a` fill + Lora SemiBold; inactive: `#d6abb3` fill
  + Open Sans Regular
- **Recognition sidebar** — gold top border, entries separated by 20% opacity gold rules

---

## Pages

### 1. Homepage `/`
**Status:** Design complete in Figma (node 39:2, 1440px)  
**Sections in order:**
- Hero — full-bleed photo, floating nav pill, show date cards overlaid on photo
  (tabbed: Up Next / Just Added / Past Shows)
- ★★★ LINER NOTES ★★★ — bio with Praise drop cap, blockquote with pink left
  border, recognition sidebar with gold rules
- ★★★ INSTASTAR ★★★ — Behold feed embed, guitar pick decorations,
  "Follow along between shows — @meghanclarissecave" caption
- ★★★ ELECTRONIC PRESS KIT ★★★ — EPK downloads list (Solo Acoustic, Full
  Band, Sample Set List) with thumbnail + description + action button
- ★★★ LATEST VIDEOS ★★★ — featured video large left, video list right with
  thumbnails and titles
- ★★★ DISCOGRAPHY ★★★ — chronological list: album art + year/format tag +
  title + SPOTIFY / APPLE / BUY links

**Motion targets for this page:**
- Hero photo: subtle parallax on scroll (GSAP ScrollTrigger)
- Show cards: stagger-in on load (GSAP, spring feel via CustomEase)
- Section labels (★★★): fade + slight rise on scroll enter
- Discography rows: stagger reveal on scroll
- Three.js: optional ambient particle or texture layer behind hero — decide at
  Gate 2

### 2. Shows `/shows`
**Status:** Needs design in Figma  
**Data source:** The Events Calendar REST API
  (`/wp-json/tribe/events/v1/events?per_page=50&start_date=now`)  
**Features:**
- Tab filter: Up Next / Past Shows
- Show list: same card design as homepage cards but full-page layout
- Each card links to event detail page

**Motion targets:** card stagger on tab switch (GSAP flip or simple fade/slide)

### 3. Event detail `/shows/[slug]`
**Status:** Needs design in Figma  
**Data source:** `/wp-json/tribe/events/v1/events/{id}`  
**Fields to display:** title, date/time, venue name + address, description,
featured image, set type (Solo Acoustic / Duo / Full Band — pulled from
event category or custom field)  
**Add to Calendar:** `add-to-calendar-button` npm package — generates Google,
Apple, Outlook, and .ics options from event data  
**Motion targets:** hero image parallax, content fade-in

### 4. Shop listing `/shop`
**Status:** Needs design in Figma — hardgraft reference  
**Data source:** WooCommerce REST API (`/wp-json/wc/v3/products`)  
**Reference:** hardgraft.com listing page — editorial layout, full-bleed
product photography, typography-led, no generic grid  
**Current products (14):** mix of merch (hats, koozies, mugs, bandanas),
CDs, poetry book, stickers, key chain  
**Features:** filter by category (Music / Merch), sort; add to cart from listing  
**Cart:** client-side cart state (Zustand with `persist` middleware). SSR caveat: use `skipHydration: true` on the store and call `useCartStore.persist.rehydrate()` in a `useEffect` on the cart component — localStorage does not exist during Next.js server rendering and will cause hydration mismatches if not guarded.

**Motion targets:** product images: scale on hover (subtle, spring); page
entrance stagger

### 5. Product detail `/shop/[slug]`
**Status:** Needs design in Figma — hardgraft reference  
**Data source:** `/wp-json/wc/v3/products/{id}`  
**Features:** image gallery (if multiple images), product name, price, short
description, variant selector (size where applicable), add to cart, quantity  
**Hardgraft aesthetic cues:** single large image, generous whitespace, type
carries the page, add-to-cart is present but not aggressive

**Motion targets:** image fade-in, add-to-cart button spring on interaction

### 6. Cart + Checkout `/cart`, `/checkout`
**Status:** Needs design  
**Cart:** sidebar drawer or `/cart` page — line items, quantity controls, subtotal,
proceed to checkout  
**Checkout:** WooCommerce REST API  
  - `POST /wp-json/wc/v3/orders` to create order
  - Payment: PayPal (existing gateway) via WooCommerce payment flow
  - Shipping: pulled from WC shipping zones
**Note:** WooCommerce nonce handling required for REST write operations — store
WC nonce client-side, refresh on expiry

### 7. EPK `/epk`
**Status:** Design partially in Figma (EPK section on homepage is the template)  
**Content:** Solo Acoustic EPK download, Full Band EPK download, Sample Set List  
**Standalone page** expands the homepage EPK section into a full page with
additional bio copy, press photos download, and quote blocks

### 8. Media `/media`
**Status:** Existing page content carries over  
**Content:** Photos grid, Videos (YouTube embeds)

### 9. Booking `/booking`
**Status:** Existing form carries over  
**Implementation:** Contact Form 7 (existing WP plugin) — consumed via REST or
iframe depending on spam protection needs

### 10. About subpages `/about/solo-acoustic`, `/about/full-band`
**Status:** Existing content carries over  
**These are existing WP pages** — fetched via REST, rendered in Next.js

---

## Motion system

All motion is alive by default. Exceptions require a written reason.

**GSAP usage:**
- ScrollTrigger for all scroll-driven reveals (scrub: false, start: "top 80%")
- Stagger pattern: 0.08s between items, y: 24 to 0, opacity: 0 to 1, duration: 0.55
- CustomEase "spring" for interactive moments: CustomEase.create("spring", "M0,0 C0.14,0 0.27,0.07 0.37,0.22 0.52,0.44 0.57,0.7 0.68,0.85 0.78,1 0.91,1 1,1")
- Reduced-motion: all GSAP animations gate on `prefers-reduced-motion: reduce`

**Three.js usage (homepage hero):**
- Decide at Gate 2 whether to include
- If included: low-poly ambient geometry or texture plane with subtle distortion,
  not particles (particles are on the slop-blocklist)
- Canvas sits behind photo, mix-blend-mode soft-light or screen at low opacity

**Framer Motion:**
- Cart drawer open/close, tab switches, modal transitions
- Spring physics: `{ type: "spring", stiffness: 400, damping: 25 }`

---

## Data fetching strategy

| Data type | Fetch strategy | Revalidation |
|---|---|---|
| Homepage shows | ISR — `fetch` with `{ next: { revalidate: 3600 } }` | 1 hour |
| Shows list page | ISR | 1 hour |
| Event detail | ISR per slug | 1 hour |
| Products | ISR | 24 hours (low churn) |
| Product detail | ISR per slug | 24 hours |
| Instagram feed | Behold client-side embed or ISR | Behold handles |
| EPK / static pages | Static at build | Deploy only |

---

## Shows quick-entry (Zapier setup)

**Goal:** Meg texts or emails show details from her phone or PC; a draft event
appears in The Events Calendar for her to review and publish.

**Recommended flow — Email path (no phone dependency):**
1. Meg emails `shows@megcmusic.com` (a Gmail alias or dedicated address)
2. Zapier trigger: new email matching subject pattern (e.g. "NEW SHOW:")
3. Zapier action: WordPress — Create Post, post type `tribe_events`, status `draft`,
   title from email subject, content from email body
4. The Events Calendar fields (date, venue) can be parsed from a simple structured
   format Meg learns once: `Date: June 20 7pm | Venue: The Walnut Room | City: Denver CO`
5. Meg gets a WP dashboard notification, reviews the draft, fills any missing
   fields, publishes

**SMS path (optional, same setup):**
- Twilio phone number forwards to same Gmail → same Zapier trigger
- No app install required; Meg texts the number from any device

**Setup time:** ~45 minutes. One-time. Meg needs a free Zapier account.

---

## Sprint plan

| Sprint | Deliverable | Data live? |
|---|---|---|
| 1 | WordPress headless setup: CORS config, WP REST + WC REST + Events Calendar REST confirmed, Behold account, Next.js scaffold + token system + deploy pipeline | No |
| 2 | Homepage — full Figma implementation, GSAP scroll reveals, Behold Instagram, shows tab pulling live data | Yes (shows, Instagram) |
| 3 | Shows list + Event detail + Add to Calendar | Yes |
| 4 | Shop listing + Product detail (hardgraft aesthetic) | Yes |
| 5 | Cart + Checkout (Zustand cart, WC REST order creation, PayPal) | Yes |
| 6 | EPK, Media, Booking, About subpages | Yes |
| 7 | Zapier show quick-entry setup + documentation for Meg | — |
| 8 | Polish: Three.js hero (if approved at Gate 2), mobile breakpoints audit, performance pass, redirects, analytics | — |

---

## WP backend setup required before Sprint 1

These are manual steps on the existing Bluehost WordPress install:

1. **Enable CORS** — activate the `megc-cors` custom plugin in WP dashboard → Plugins
2. **Confirm REST endpoints are live:**
   - `/wp-json/wp/v2/pages`
   - `/wp-json/wc/v3/products` (returns 401 = correct; 404 = WC REST not enabled)
   - `/wp-json/tribe/events/v1/events`
3. **Create WooCommerce REST API key** (Consumer Key + Secret, Read/Write)
   WooCommerce → Settings → Advanced → REST API → Add Key
4. **Set up Behold account** at behold.so, connect Instagram, copy feed ID
5. **Add custom fields to tribe_events** if needed: set type (Solo/Duo/Full Band)
   — use Advanced Custom Fields free tier

**Before Sprint 5 only (not needed now):**
- Install JWT Authentication for WP REST API plugin
- Add `JWT_AUTH_SECRET_KEY` and `JWT_AUTH_CORS_ENABLE` to `wp-config.php`

---

## Open decisions (block Gate 1)

- [ ] Three.js on hero: yes/no (decide at Gate 2 after homepage design is reviewed)
- [ ] Shop layout: design needed in Figma before Sprint 4 starts
- [ ] Event detail layout: design needed in Figma before Sprint 3 starts
- [ ] Behold vs EmbedSocial: pick one (Behold recommended — simpler API)
- [ ] WC nonce strategy: cookie-based (standard) vs custom header — log ADR at Sprint 5 kickoff

---

## What Meg never needs to touch

- Code
- Vercel dashboard
- WooCommerce REST keys
- Behold token refresh (automatic)

**What Meg manages exactly as today:**
- Adding/editing shows in The Events Calendar (or via email/SMS with Zapier)
- Adding/editing products in WooCommerce
- Uploading EPK documents
- Managing orders in WooCommerce

---

## Figma work remaining before Gate 2

1. Shop listing page (hardgraft reference: editorial layout, full-bleed photography)
2. Shop product detail page (hardgraft reference: single image, type-led)
3. Event detail page
4. Shows list page
5. Mobile breakpoints: 390px for all of the above + homepage
