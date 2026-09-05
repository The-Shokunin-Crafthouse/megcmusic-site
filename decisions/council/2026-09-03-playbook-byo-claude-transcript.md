# COUNCIL TRANSCRIPT — Playbook as a downloadable, bring-your-own-Claude product (2026-09-03)

Chairman: Fable (claude-fable-5-1). Seats: Market/Craft/Risk on opus, Ops/Finance on sonnet. Premortem: five fresh opus passes.

Contents: 1 Brief · 2 Blind seats · 3 Peer ranking · 4 Rebuttal · 5 Premortem log + rounds · 6 Final synthesis

---

# COUNCIL BRIEF — "Playbook" as a downloadable, bring-your-own-Claude product

Prepared 2026-09-03 by the chairman. This is the entire fact base. Do not assume facts not stated here; if you need one, say so and reason conditionally.

## The idea (two sentences)

Take Meg's Playbook — a private AI social-media co-pilot built for one Colorado singer-songwriter — to market as an app anyone can download, connect their own Instagram/Facebook accounts to, and power with **their own Claude subscription**, so they get the same personalized experience without the studio paying for inference. Secondary questions the council must answer: (a) which industries beyond musicians could use it with minimal feature rework and who exactly to market it to, and (b) how to monetize it.

## What exists today (verified in the repo, 2026-09-03)

- A mobile-first PWA at `megcmusic.com/megs-playbook` (Next.js on Vercel, Supabase). Four tabs: **Home** (daily insight, rule-based "Your Next Post" recommendation, last-post stats), **Stats** (Instagram/Facebook post metrics: reach, engagement, ratio, per-post insight), **Booking** (venue outreach pipeline + reply tracking, sent from one Gmail account by a weekly automated run), **Checklist** (daily/IG/FB check-off items). Plus a guided **creation flow**: idea → "make it better" → 3–6 AI-generated questions (six question types) → storyboard (4–8 frames with on-screen text and copy-ready asset prompts) → 3–5 title options → caption/posting window → save to a library.
- A **tips library** of 210 hand-written seed tips mined from Meghan's own account history, plus daemon jobs that derive new tips from her post performance and retire contradicted ones.
- A **rules document** (`playbook.json`) of researched Instagram/Facebook platform rules, refreshed weekly by a scheduled Cowork research run.
- **AI generation** does not run on a server. The PWA writes a job row to Supabase; a small Node program (a "daemon") running on Meghan's Mac polls for it, shells out to the **Claude Code command-line program** (`claude -p`, model pinned to Sonnet, effort per job kind), validates the JSON, writes it back. She logs into Claude Code herself via Anthropic's own `/login` flow; the daemon never touches her credentials. It only runs while she is logged in (macOS Keychain constraint; verified, an earlier system-daemon approach failed 100% of jobs). Storyboard jobs take 40–100 s; a rate-limited job is requeued with backoff.
- **Single-tenant by construction:** RLS disabled on every table, no `user_id` column anywhere, no login — access is an unguessable URL. Anyone with the URL can enqueue jobs that spend Meghan's subscription.
- **Instagram/Facebook data** comes from a Meta **System User token** provisioned by hand by the studio, not a self-serve "connect your account" flow. No content publishing — the product plans and storyboards; she posts manually.
- No billing, no ToS/privacy policy, no analytics on the playbook surface. Gate 3 is open on one line (LCP 6.8 s on Home). Roughly half the surface (Booking, one-Gmail outreach, the 210 tips, the register of every prompt) is Meghan-specific.
- Built as **client-funded work** under the megcmusic-site engagement. **IP ownership / right to commercialize is unresolved** with Meghan.

## Prior council (2026-08-03) — binding context

Verdict **PARK** on a public multi-tenant release (4 of 5 seats). Top gaps: no multi-tenant data model; no self-serve OAuth account linking; no scalable, metered, cost-isolated AI backend. **Unpark trigger:** a hand-provisioned pilot with non-Meghan artists/social-media managers, no self-serve signup, no tenancy engineering, that produces **8–10+ verbal/deposit commitments at a stated price** before any auth/billing/tenancy/OAuth work. Monetization consensus then: tiered subscription with a hard AI-generation quota ($15–35/mo solo, $59–99/mo manager tier) plus metered overage. The present brief is a **new brief** because it changes the AI-backend premise (user brings their own Claude) and widens the market question; it does not overturn the PARK — it asks whether the new premise changes the unpark conditions.

## Verified external constraints (2026-09-03)

1. **Anthropic policy (official Claude Code legal page):** "Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, or Max plan credentials on behalf of their users. Moreover, developers may not collect, store, or intermediate Claude.ai credentials or session tokens — sign-in to a Claude account must complete through Anthropic's own flow." **So "enter your Claude credentials into our app" is prohibited.** The same page permits: (a) a product that **preinstalls or runs the unmodified Claude Code binary** where **each end user signs in themselves** with their own subscription or API key and is billed directly by Anthropic — this requires the studio to accept Anthropic's Commercial Terms and never resell/intermediate usage; (b) users bringing **their own API key** (metered, billed to them); (c) the studio using its own API key and metering users (normal SaaS). Advertised Pro/Max limits "assume ordinary, individual usage"; Anthropic "may enforce without prior notice." A February–April 2026 crackdown blocked third-party harnesses on subscription auth; an announced "Agent SDK credit" ($20/mo Pro, $100 Max 5x) was then **paused** — today third-party Agent-SDK/`claude -p` usage still draws from the user's ordinary subscription limits. Net: the only subscription-powered shape is a **desktop companion that runs real Claude Code locally**; a phone app cannot run it, so a phone-only product must use API keys.
2. **Meta/Instagram:** only Business/Creator accounts have API access (personal accounts: none; Basic Display API sunset Sept 2025). Serving third-party users requires **Advanced Access via Meta App Review + Business Verification** (working demo, screen recordings, per-permission proof). Insights (incl. Reels) and publishing are supported; publishing caps ~50–100 posts/24 h; media must be at a public HTTPS URL.
3. **Competitor pricing (2026):** Buffer free (3 channels) / $6 per channel; Later ~$25 Starter / ~$45 Growth; Metricool free / ~$18 Starter / ~$45 Advanced. All ship a generic "AI assistant" for rewriting posts; none plan from the user's own performance data with a storyboard + asset-prompt output, and none run on the user's own Claude.

## Who pays and why

Hypothesis: solo creators and very small businesses who already pay $20+/mo for Claude, hate generic "AI caption" tools, and want a co-pilot that knows their numbers and their voice. The willingness-to-pay has **not** been tested with anyone except Meghan (who does not pay).

## Why this studio

Shokunin has already built and shipped the whole loop for one real user, with Claude-native generation, a performance-conditioned recommender, and a motion-quality PWA. The studio is one person (Levi, designer, AI-driven build). No sales team, no support desk, no Meta business-verified entity yet.

## Known constraints

Solo founder; wedding 2026-09-29 (calendar dead zone late Sept–mid Oct); studio capacity is shared with paying client work (megcmusic Sprint 11 active); no budget line for this; IP with Meghan unresolved; Anthropic policy can change without notice.

## What "win" looks like in 12 months

A product with a name that is not Meghan's, 100+ paying users at a price that covers its own run cost, in one clearly-defined vertical, with an Anthropic-compliant AI path, Meta App Review passed, and a case study Shokunin can put its name on.

## What each seat must return

1. Verdict on the idea **as the brief poses it** (downloadable app + own social accounts + own Claude): PROCEED / PROCEED-WITH-CONDITIONS / PARK / KILL, with three strongest reasons, the single strongest argument against your own verdict, and any conditions.
2. **Industries** beyond musicians that fit with minimal rework, ranked; for each, what breaks and what carries over. Name the single **best first target segment** and the concrete channel to reach them.
3. **Monetization** recommendation, given that the user may be paying Anthropic directly for inference.
4. Whether the new premise changes the prior council's **unpark trigger**, and how.

---

# SEAT: MARKET (opus) — blind pass

## Verdict
**PARK** — on the idea exactly as posed (downloadable app + own social accounts + own Claude subscription).

## Three strongest reasons

1. **The "own Claude" premise doesn't survive contact with the delivery shape the market wants.** The brief's only compliant subscription-powered path is a *desktop companion running the unmodified Claude Code binary, each user signing in themselves*. But the product that exists is a **mobile-first PWA**, and the buyer — a creator planning Reels between gigs — works from a phone. A phone-only product must use API keys (metered, billed to them). So the pitch collapses into either "install a Mac daemon and keep it logged in" (a support surface a one-person studio with no support desk cannot carry) or "paste an Anthropic API key" (which is not the $20/mo Claude subscription the hypothesis rests on). Meghan's own setup already proves the fragility: jobs only run while she is interactively logged in, and an earlier system-daemon approach failed 100%.

2. **Zero demand evidence, and the prior council's demand gate is still unmet.** The brief states willingness-to-pay has not been tested with anyone but Meghan, who does not pay. The 8–10 commitments trigger from 2026-08-03 remains unsatisfied. The new premise changes the *cost* story, not the *demand* story — and the PARK was primarily a demand-and-tenancy verdict, not a cost verdict.

3. **The gating dependencies are external, slow, and not owned by the studio.** Meta Advanced Access requires App Review plus **Business Verification**, and the studio has "no Meta business-verified entity yet." Anthropic policy already moved twice in 2026 (Feb–Apr crackdown; Agent SDK credit announced then *paused*) and "may enforce without prior notice." On top of that, **IP ownership with Meghan is unresolved** — the studio may not have the right to commercialize the asset at all. Building against three unresolved external gates, with a solo founder, a Sept 29 wedding dead zone, active client Sprint 11, and no budget line, is how a project dies half-built.

## Strongest argument against my own verdict

The competitive gap described is real and unusually specific: Buffer/Later/Metricool all ship generic "rewrite your caption" AI; **none** plan from the user's own performance history and output a 4–8 frame storyboard with copy-ready asset prompts. That is a differentiated wedge in a category where incumbents charge $18–45/mo, so the price umbrella exists. And the marginal cost of *testing* demand is near zero — the studio can sell hand-provisioned pilots on the existing single-tenant build with no tenancy, auth, OAuth, or billing work. If the wedge is real, a PARK that reads as "stop" burns the only cheap window the studio has. My answer: PARK the *download-and-BYO-Claude product*, and run the pilot test anyway — which the conditions below make explicit.

## Conditions I would attach

- **C1 (Levi, by 2026-09-26, before the wedding dead zone):** Resolve IP/commercialization rights with Meghan in writing. Nothing else proceeds until this is signed. This is the cheapest and most absolute gate.
- **C2 (Levi, by 2026-09-26):** Ten discovery calls with non-Meghan targets, price stated out loud. No build.
- **C3 (Levi, by 2026-11-14, post-honeymoon):** Reach 8–10 verbal/deposit commitments at a stated price, hand-provisioned, per the prior trigger — *unchanged in count and unchanged in "before any tenancy work."*
- **C4 (Levi, concurrent with C2):** Kill the mobile-BYO-Claude framing in every conversation. Sell the service outcome; keep the inference path an implementation detail until C3 clears.
- **C5:** Do not begin Meta Business Verification until C3 clears — it costs weeks and demands a working demo.
- **C6:** Do not name or brand the product until C1 clears.

## Industries beyond musicians (ranked, minimal rework)

1. **Independent live-performing acts adjacent to music — comedians, DJs, drag/burlesque, touring poets.** Carries over: everything. Show-driven cadence, venue outreach, Reels-first, performance-conditioned tips. Breaks: the 210 tips are mined from Meghan's account and would need re-seeding per persona; Booking's one-Gmail outreach is Meghan-specific.
2. **Fitness/yoga instructors and independent studios.** Carries: creation flow, storyboards, stats, checklist, class-schedule cadence ≈ show cadence. Breaks: Booking (venue outreach) has no analogue — it becomes lead nurture or class promotion; roughly a quarter of the surface is dead weight.
3. **Restaurants, cafés, breweries, food trucks.** Carries: storyboard + asset prompts (food is visual), stats, checklist, posting windows. Breaks: Booking entirely; also they are least likely to already pay $20+/mo for Claude — pushing them onto the studio-API-key SaaS model.
4. **Realtors and independent agents.** Carries: creation flow and stats; high WTP and brokerage budget. Breaks: heavy compliance/disclosure requirements the tips library knows nothing about; listing-driven, not performance-driven, content.
5. **Wedding/portrait photographers and other solo creative-service businesses.** Carries: storyboards, stats, seasonal cadence, and Booking maps cleanly to client inquiry pipeline. Breaks: least — but they are the most saturated with existing tooling.

Note that rank 1 is the *least* rework but the *smallest and poorest* market; rank 5 is the best pipeline fit at higher WTP. I assume nothing about the actual size of any of these — the brief gives no market-size data.

## Best first target segment + concrete channel

**Solo social-media managers who run 3–8 independent-artist accounts.** They already pay for tooling, feel the pain per-account (so the $59–99 manager tier is credible), have Business/Creator accounts already connected to Meta (clearing constraint #2 for the pilot), and are technical enough to tolerate a hand-provisioned setup. One of them replaces ten solo artists in revenue and in feedback quality.

**Channel:** Levi personally DMs and calls the social-media managers of Colorado venue and festival rosters — the same venue relationships megcmusic's Booking pipeline has already surfaced. That is a warm, local, finite, verifiable list, reachable by one person without a sales team. Secondary: a single case-study post about what was built for Meghan, on Levi's own channels, as inbound.

## Monetization recommendation

**Do not build BYO-Claude pricing.** It saves the studio inference cost but hands the customer an install burden, a policy risk the studio can't control, and a confusing "you also need a $20/mo Claude subscription" second bill — a conversion killer at the top of a funnel that has never converted anyone.

Recommend instead, in order:

- **Now (pilot, through C3):** flat **$99/mo hand-provisioned concierge**, or a **$199 setup + $49/mo**, invoiced manually. A deposit is the only real demand signal. Run inference on the studio's own API key and eat it — at pilot scale the cost is a rounding error against the information value, and it keeps the studio inside Anthropic's normal-SaaS lane (constraint 1c) with zero policy exposure.
- **Post-C3:** the prior council's structure stands — **$29/mo solo, $79/mo manager tier**, both with a hard generation quota plus metered overage. Storyboard jobs are 40–100 s of Sonnet; quota is the cost control, not the auth model.
- **BYO API key as an optional discount tier only** (constraint 1b — metered, billed to them), offered to heavy users who want to blow past quota. Never as the default path, never as the pitch.

## Does the new premise change the prior unpark trigger?

**No — it does not loosen it, and it adds one clause.**

The prior trigger was set on *demand*, not on AI cost. BYO-Claude addresses cost only. Every gap the last council named — no multi-tenant model, no self-serve OAuth, no scalable metered backend — is untouched by this premise; BYO-Claude arguably makes the second and third *worse*, because a per-user local daemon is a harder support and reliability surface than one metered API key, and it still doesn't solve Meta OAuth at all.

Two amendments:

- **Add a hard prerequisite ahead of the trigger: written IP/commercialization resolution with Meghan (C1).** The old trigger implicitly assumed the studio could sell this. The brief now states it can't confirm that. Ten commitments on an asset you don't own is a liability, not a milestone.
- **Add to the trigger's definition of "at a stated price": the price must be quoted with the studio carrying inference.** If commitments only materialize at a BYO-Claude price, that is evidence of price sensitivity, not product demand, and should not count toward unpark.

Everything else — 8–10 commitments, hand-provisioned, no self-serve signup, no tenancy/auth/billing/OAuth work first — stands exactly as written.

---

# SEAT: CRAFT (opus) — blind pass

## Verdict

**PARK** — on the idea exactly as posed (downloadable app + user's own social accounts + user's own Claude).

## Three strongest reasons

1. **The premise forces a shape the craft can't survive.** The brief's own constraint chain: subscription-powered Claude requires running the unmodified Claude Code binary locally, with each user signing in themselves; a phone can't run it; the shipped product is a *mobile-first PWA*. So "bring your own Claude" means every user installs a Mac daemon, self-authenticates via `/login`, and keeps their laptop awake and logged in — because the verified macOS Keychain constraint killed the system-daemon approach 100%. Then they wait 40–100 s for a storyboard. That is the studio shipping a *known* fragile dependency as the product's central mechanism. A tool whose first-run instruction is "install a terminal companion and stay logged in" is not something a Colorado singer-songwriter's peer group can use, and it is not something the studio's name belongs on. It's Meghan's rig, generalized — a workshop jig sold as a machine.

2. **Half the surface is a portrait of one person, and the good half is the hard half.** Booking (one Gmail account, weekly automated run), the 210 hand-mined tips, and the prompt register are Meghan-specific per the brief. Strip those and you have Home + Stats + Checklist + creation flow — competent, but the *differentiation* the brief itself claims ("plans from the user's own performance data") is carried by the tips corpus and the performance-conditioned recommender, both of which are seeded from one account's history. For user #2 on day one, there is no history, no tips, no recommender signal. The excellent experience is a cold-start problem the brief does not acknowledge, and a generic day-one experience is exactly the "generic AI caption tool" the hypothesis says users hate.

3. **Nothing has been shown to anyone.** Willingness-to-pay untested outside Meghan, who doesn't pay. IP and right to commercialize unresolved with the client who funded it. No name that isn't hers. Under studio rules that is not a scope call to make quietly — it's money/brand/ownership, and it's unresolved. Building distribution craft on top of an unowned asset is the one failure mode you cannot design your way out of later.

## Strongest argument against my own verdict

The desktop-companion shape may be a *feature* for the one segment that matters. Social-media managers already live on a Mac all day, already keep tools running, and already pay for Claude. For them the daemon is invisible and the "your Claude, your data, your key" story is a genuine trust differentiator no competitor at $18–45/mo can match. If the real product is a Mac-first pro tool rather than a phone PWA, my objection #1 collapses into a positioning correction, not a park. I hold PARK because the brief poses a *downloadable app* for creators, and because reasons #2 and #3 stand independently.

## Conditions I would attach

Owner is Levi on all; the wedding dead zone (late Sept–mid Oct 2026) sets the dates.

- **C1 — IP resolved in writing with Meghan before any external showing.** Target 2026-09-20 (pre-wedding). Hard gate; nothing else starts.
- **C2 — Name and brand separated from Meghan.** Working name + one-page positioning before any pilot conversation. Target 2026-10-24.
- **C3 — Cold-start proof.** Demonstrate the recommender producing a defensible first recommendation for an account with zero history in the system, using only imported Meta insights + the generic rule set. If it can't, the product is a tips library, not a co-pilot. Target 2026-11-07.
- **C4 — Onboarding time-to-first-storyboard measured on a non-Meghan Mac, cold, timed, by a non-technical user.** Target under 15 minutes including Claude Code login. If it exceeds 30, the BYO-Claude premise is dead and the answer is studio API key + metering.
- **C5 — LCP 6.8 s on Home closed before any outsider sees it.** A 6.8 s first paint is not a Shokunin surface. Target 2026-11-14.
- **C6 — ToS + privacy policy exist before the first non-Meghan account touches it.** Also closes the "unguessable URL, RLS disabled, anyone can spend her subscription" hole, which today is a live liability, not a future one.

## Industries beyond musicians (ranked, minimal rework)

1. **Independent social-media managers / one-person agencies.** Carries over: Stats, creation flow, storyboard + asset prompts, Checklist, and — uniquely — Booking, which maps almost intact to client prospecting. Breaks: single-tenant by construction; a manager needs many accounts, which is the exact multi-tenant work the prior council parked on. Also the tips corpus must become per-client, not global.
2. **Local music venues / small event promoters.** Carries over: everything, plus Meghan's own domain rules already fit event-driven posting. Breaks: nothing structural; the tips are artist-voiced and need re-mining.
3. **Fitness instructors, tattoo artists, barbers, small studios** — visual, Business-account-native, performance-legible. Carries over: full creation flow, Stats, Checklist. Breaks: Booking is useless (they have booking software); tips corpus wrong entirely.
4. **Restaurants / cafés.** Carries over: Stats + storyboard. Breaks: cadence is menu- and season-driven, not release-driven; the recommender's assumptions don't transfer.
5. **Realtors.** Carries over: little beyond the shell. Breaks: compliance-constrained copy, listing-feed integration expected. Skip.

## Best first target segment + channel

**Independent social-media managers serving 3–8 small clients, Mac-based, already paying for Claude.** They tolerate the daemon, they have accounts to connect today, they can state a price, and per the brief they are the tier competitors price highest ($45 Growth/Advanced) — so a $59–99 manager tier has a proven ceiling to sit under.

**Channel:** hand-picked outreach, not broadcast. Use the Booking module's own pipeline mechanic — the studio already runs it weekly — to work a list of 40 named managers found in Instagram bios ("social for [brands]") in Colorado and two adjacent metros, offering a hand-provisioned pilot with Levi setting up the Meta token personally. One person, no funnel, no ads. Anything requiring a support desk is out of capacity.

## Monetization recommendation

**Do not discount for BYO-Claude, and do not build a BYO-only tier.** The user paying Anthropic directly changes the studio's cost basis, not the product's value — and telling users "you pay Anthropic too" while charging full price is only defensible if the value is legible, which is precisely what's untested.

Recommended shape: **one price, two fulfillment paths.** $49/mo solo, $99/mo manager (3–8 accounts). Inference default is **studio API key with a hard monthly generation quota** — Anthropic-permitted path (c), predictable for the user, no daemon, phone-friendly, and it keeps the craft of onboarding under studio control. Offer **BYO (own API key, or local Claude Code)** as an option for power users, priced identically, with the benefit framed as *higher quota and your data never touching our key* rather than a discount. That keeps a single price to defend in pilot conversations, avoids building billing logic around someone else's rate limits, and — critically — means an Anthropic policy change (which the brief says can happen without notice) breaks an *option*, not the business.

Reject metered overage at pilot stage: it makes the price un-stateable, and the unpark trigger requires a *stated price*.

## Does the new premise change the prior unpark trigger?

**It does not weaken it, and it adds one clause.**

The prior trigger — hand-provisioned pilot, non-Meghan users, no self-serve signup, no tenancy/auth/billing/OAuth work, 8–10+ verbal/deposit commitments at a stated price — survives intact, because BYO-Claude addresses only the *cost-isolation* gap of the three the prior council named. Multi-tenancy and self-serve OAuth are untouched; if anything BYO-Claude makes tenancy *harder*, since per-user compute now lives on per-user machines.

The clause I would add: **the 8–10 commitments must be collected at a stated price after the prospect has watched the actual onboarding**, not from a description of it. If the demo is a phone screen and the reality is a Mac daemon, the commitments measure nothing. Concretely — fold C4 into the trigger: no commitment counts unless that prospect saw time-to-first-storyboard on their own machine, or was quoted the studio-key path they'll actually get.

Assumption stated: the brief gives no evidence about whether target users are Mac-based or whether any non-Meghan person has ever completed Claude Code `/login` unaided; C4 exists to remove that assumption rather than reason past it.

---

# SEAT: OPS (sonnet) — blind pass

## Verdict
PROCEED-WITH-CONDITIONS

## Three strongest reasons

1. **The desktop-companion shape is the only Anthropic-compliant path that fits the studio's actual capacity** — a solo founder with no support desk cannot build a metered API backend right now, and the brief confirms it: "no budget line for this," "no sales team, no support desk." A BYO-Claude desktop companion pushes inference cost and per-user support (login issues, rate limits) onto Anthropic's own auth flow and the user's own troubleshooting, which is the only support model this studio can absorb today.

2. **Calendar math kills any near-term timeline that isn't conditioned.** Wedding 2026-09-29 with a "dead zone late Sept-mid Oct," plus megcmusic Sprint 11 active as paying client work that must stay serviced. Any unconditioned PROCEED risks the same failure mode the prior council flagged implicitly: solo-founder bandwidth split three ways (client work, wedding, new venture) with zero slack.

3. **The daemon architecture that exists today is a single point of failure the brief itself documents as already having failed once** — "an earlier system-daemon approach failed 100% of jobs" because generation only works while Meghan is logged into Keychain-backed Claude Code. Porting this pattern to *any* new user means every user's daemon depends on their own machine staying logged in, awake, and unmodified — a support burden model that doesn't scale past a handful of hand-held pilot users, which is exactly why this must stay a hand-provisioned pilot, not a download-and-go product, at this stage.

## Strongest argument against my own verdict

The brief's own evidence is that the *system-daemon* variant failed 100%, and the working variant depends on Meghan personally being logged in on her own Mac — a constraint that has literally never been tested with a second human. There is no evidence in the brief that the "each user signs in with their own Claude Code" shape works reliably for anyone but the one person who built it and watches it. Given zero support desk and zero engineering headcount beyond Levi, a single new user hitting the Keychain/login-lapse failure mode is a support incident with no queue, no triage, and no one else to route it to. That argument favors PARK, not PROCEED-WITH-CONDITIONS — and it's the reason my conditions below gate hard on pilot-scale validation before any download-and-go release.

## Conditions I would attach

- **C1 (Levi, before any pilot user is onboarded):** Reproduce the "logged-in daemon" pattern on a second machine, with a second Claude account, and confirm it survives a full week without Levi's intervention. If it doesn't, this is a KILL on the current architecture, not a PROCEED.
- **C2 (Levi, ongoing):** No pilot outreach or building begins until megcmusic Sprint 11 deliverables are either complete or explicitly reprioritized with the client's sign-off — this is client-funded time, and covertly borrowing capacity from it is a scope violation.
- **C3 (Levi, hard stop 2026-09-22):** Zero new-venture work during the Sept 29 wedding dead zone; any pilot commitments must be scheduled assuming a 3+ week blackout starting late September.
- **C4 (Levi, before first non-Meghan pilot user):** Resolve IP/commercialization rights with Meghan in writing — operationally, running a pilot on a codebase whose ownership is contested is a shutdown risk if she objects mid-pilot.
- **C5 (Levi, per prior council's unpark trigger, reaffirmed):** 8-10+ verbal/deposit commitments at a stated price, hand-provisioned, before any further engineering investment beyond C1's reliability proof.

## Industries beyond musicians (ranked, minimal rework)

1. **Independent visual artists / illustrators selling on Instagram** — carries over: performance-conditioned recommender, storyboard-to-caption flow, tips-library concept (just re-seeded). Breaks: Booking tab (venue outreach) is meaningless — dead weight to strip, not a selling point.
2. **Boutique fitness/wellness instructors (yoga, personal training) building a personal-brand Instagram** — carries over: daily insight + checklist habit loop, stats tracking. Breaks: Booking tab still irrelevant; tips library needs a full re-mine (no 210-tip seed exists for this niche, meaning real content-ops labor before day one).
3. **Wedding/event vendors (photographers, florists) with visual portfolios** — carries over: storyboard/asset-prompt generation fits their content style well. Breaks: Booking tab is *closer* to relevant (they do outreach) but the current Booking is single-Gmail, Meghan-specific automation — a rebuild, not a rename.

Musicians remain the tightest fit for everything except Booking's Gmail account being singular; every other vertical requires discarding or fully rebuilding two of the four tabs (Booking, and the seed-tip library), which is why "minimal rework" favors staying in music-adjacent creator space rather than jumping verticals.

## Best first target segment + channel

**Solo working musicians who already pay for Claude and post on Instagram/Facebook without a team** — i.e., Meghan's own peer network. Channel: **direct hand-provisioned outreach through Colorado/regional singer-songwriter circuits and house-show/DIY-tour networks Meghan is already embedded in** — this is the only channel consistent with "no sales team, no support desk" and matches the prior council's unpark trigger methodology (hand-provisioned pilot, no self-serve signup).

## Monetization recommendation

Flat low-friction fee justified by *zero inference cost to the studio* — something like $10-15/mo covering app maintenance, tips-library curation, and Meta API costs only, not compute. This is an operationally sustainable price only if support stays near-zero per user (see C1); if Keychain/login reliability issues surface per-user, the true cost is founder time, not inference, and the price should reflect a support-included tier ($25-35/mo) instead. Do not price assuming AI generation is free to serve — the desktop-daemon dependency itself has an operational cost even without a metered API bill.

## Does the new premise change the prior unpark trigger? How?

No — it keeps the trigger's *shape* (hand-provisioned pilot, no self-serve signup, no tenancy engineering, 8-10+ verbal/deposit commitments) but changes what must be proven before those commitments count. The prior trigger was written assuming the eventual backend would be a metered API the studio pays for and must engineer multi-tenant. The new premise removes that engineering bar but substitutes an unproven operational one: C1's daemon-reliability-on-a-second-machine test. Practically, this makes the unpark trigger *easier to reach financially* (no tenancy/billing engineering blocking it) but *harder to reach operationally* — the studio cannot in good conscience take 8-10 deposits until it has evidence the login-dependent daemon pattern works for someone other than Meghan.

---

# SEAT: RISK (opus) — blind pass

## Verdict

**KILL** the idea as posed — a downloadable app powered by the end user's own Claude subscription. **PARK stays in force** for the underlying product; the BYO-Claude premise should be killed as a distinct path, not parked, because its central mechanism is defeated by a policy the brief itself verifies.

## Three strongest reasons

1. **The premise is only legal in a shape the product cannot take.** Constraint 1 prohibits collecting, storing or intermediating Claude.ai credentials, and the only subscription-powered permitted shape is "preinstalls or runs the unmodified Claude Code binary" with each user signing in themselves. The brief states plainly: a phone app cannot run Claude Code, so a phone-only product must use API keys. The idea as posed is "download an app, connect Instagram, power it with your Claude subscription" — a mobile-first PWA. There is no compliant version of that sentence. The compliant fallback (each user installs and logs into real Claude Code on a Mac, plus a local polling daemon) converts a consumer download into a developer-tool install, and the brief's own evidence says that local path is fragile: it runs only while the user is logged in, an earlier system-daemon approach failed 100% of jobs, and storyboards take 40–100 s.

2. **Even where permitted, the economics rest on a policy Anthropic has already moved against and can change without notice.** The brief records a Feb–Apr 2026 crackdown on third-party harnesses on subscription auth, an Agent SDK credit announced then *paused*, and advertised Pro/Max limits that "assume ordinary, individual usage" with enforcement "without prior notice." A product whose entire cost structure is "the user's ordinary subscription absorbs our inference" is asking users to spend their limits on our behalf — precisely the usage that is not ordinary and individual. If Anthropic enforces, every paying customer breaks at once. That is a correlated, un-hedgeable single point of failure with no graceful degradation, and the blast radius lands on the customer's account, not ours.

3. **We may not own what we would be selling, and the compliant path multiplies the liability surface before any revenue.** IP ownership and right to commercialize are **unresolved** with Meghan, on client-funded work; ~half the surface is Meghan-specific, including the 210 tips mined from her account history and the prompt register. Layered on that: single-tenant by construction (RLS disabled on every table, no `user_id`, no login, unguessable-URL access), no ToS, no privacy policy, no billing, a hand-provisioned Meta System User token instead of self-serve OAuth, and Meta Advanced Access requiring App Review plus Business Verification by an entity that does not yet exist. Shipping a download to strangers means accepting Anthropic Commercial Terms, publishing a privacy policy covering Meta platform data, and standing up support — as a solo founder with a wedding dead zone late Sept–mid Oct, an active paying Sprint 11, and no budget line.

## Strongest argument against my own verdict

BYO-inference is genuinely the cheapest way to test demand, and there *is* a narrow compliant lane the brief permits: **bring-your-own-API-key**, metered and billed to the user by Anthropic directly. That path is policy-clean, works from a phone (no local binary), removes our cost-of-goods entirely, and preserves the differentiator the brief identifies — no competitor plans from the user's own performance data or runs on the user's own Claude. If I am wrong, it is because I am killing the *branding* ("your Claude subscription") rather than the *architecture* (user-funded inference), and a BYO-API-key variant survives the policy test cleanly. I accept that; my conditions below keep that lane open.

## Conditions I would attach (owned, dated where possible)

All owned by Levi; none started before 2026-10-20 (post-wedding, Sprint 11 protected).

1. **IP resolution first, in writing.** A signed assignment or commercial licence from Meghan covering the codebase, the 210-tip corpus and the prompt register — or written confirmation the corpus is excluded and must be rebuilt. No other condition may start until this closes. Target 2026-10-31. If unresolved by 2026-11-30, the whole line dies.
2. **Never accept, store, proxy or prompt for Claude.ai credentials or session tokens** — permanently, no expiry, no exception. Any design that asks a user to paste a Claude login is refused at review.
3. **Kill "powered by your Claude subscription" as a marketing claim.** If a user-funded path proceeds, it is BYO-**API key** only, or Anthropic-compliant local Claude Code where the user signs in through Anthropic's own flow, and the copy says which. Owner Levi, before any external page goes live.
4. **No stranger touches the current build.** Access is an unguessable URL over RLS-disabled tables with no `user_id`; any pilot user gets a separately provisioned instance, or the pilot is run manually with no app access at all. Pilot access is not granted before tenancy or a manual workaround exists.
5. **ToS + privacy policy + named legal entity before any non-Meghan user's Meta data is processed.** Meta Business Verification cannot be attempted without the entity anyway.
6. **Written down-side budget before spend:** a cap in hours and dollars, and a pre-agreed kill date (suggest 2027-01-31) if the commitment count is not met.
7. **Policy watch as a standing item:** re-read Anthropic's Claude Code legal page at each sprint close; a change to the permitted shapes triggers an immediate re-vet.

## Industries beyond musicians (ranked, minimal rework)

1. **Independent fitness / yoga instructors and small studios.** *Carries over:* the whole planning loop — insight → questions → storyboard → titles → caption/posting window; Instagram/Facebook Business accounts are already the norm; performance-conditioned recommendation; the Checklist. *Breaks:* the 210 tips (music-specific, and possibly not ours to reuse); Booking (venue outreach has no analogue — becomes dead weight or must be repurposed to class/retreat promotion).
2. **Wedding and portrait photographers.** *Carries over:* everything visual; storyboard + asset prompts fit a portfolio-led feed exactly; strong existing willingness to pay for tools. *Breaks:* tips corpus; Booking becomes *client* inquiry pipeline, not venue outreach — a rewrite, not a deletion; higher expectation of scheduling/publishing, which the product does not do.
3. **Other live performers — comedians, DJs, dance and theatre companies.** *Carries over:* nearly all of it, Booking included (venue outreach is genuinely the same shape). *Breaks:* least of any segment — but it is the smallest market and closest to the segment we already know we cannot price (Meghan does not pay).
4. **Restaurants, cafés, breweries with events.** *Carries over:* stats, checklist, storyboard, event-driven posting; Booking repurposes to touring-act booking. *Breaks:* multiple staff touch the account (single-tenant, no login, no roles is disqualifying); daily cadence is higher than a 40–100 s local-daemon path can serve.
5. **Realtors and personal-brand coaches.** *Carries over:* the generation flow only. *Breaks:* the differentiator — these users want volume and scheduling, which we deliberately do not do; also the highest compliance and claims-review noise.

Assumption stated: the brief gives no market-size or willingness-to-pay data for any of these, so this ranking is by *rework distance and platform fit* only, not by demand.

## Best first target segment + concrete channel

**Independent wedding and portrait photographers in Colorado.** Chosen over performers because they demonstrably buy tools, and over fitness because they are visually literate — the storyboard-plus-asset-prompt output is legible to them on sight, which shortens the sell for a founder with no sales team.

**Channel:** Levi's existing megcmusic engagement puts him one degree from Colorado wedding vendors; the concrete move is in-person and hand-provisioned — attend two Colorado wedding-vendor mixers or a regional photographers' guild meetup between 2026-10-20 and 2026-12-15, demo the live storyboard flow from a laptop, and ask for a named price commitment on the spot. This is deliberately the *same* hand-provisioned, no-signup shape the prior council's unpark trigger already requires: no app access is granted, no tenancy is built, and the risk exposure is Levi's time only.

## Monetization recommendation

Given the user may pay Anthropic directly: **do not discount for it, and do not depend on it.**

- Charge a **flat subscription for the product** — the tips, the recommender, the storyboard structure, the stats pipeline — at the prior council's numbers, $15–35/mo solo. That is the defensible value; competitor pricing in the brief ($6/channel Buffer, $25–45 Later, $18–45 Metricool) puts us in range for a differentiated tool.
- Offer **BYO-API-key as an option that removes the metered overage**, not as a discount on the base fee. Rationale: the studio must never resell or intermediate usage, so inference revenue is not ours to earn; but the product value is unchanged by who pays for tokens, so the base price should not move. This also keeps the business viable if Anthropic's policy shifts again — the subscription still stands.
- **Do not build a manager/agency tier yet.** It presumes multi-seat, which presumes tenancy and roles, which the prior council correctly put behind the unpark gate.
- Explicitly reject: revenue share on inference, bundling Claude access, any pricing that implies we supply the model.

## Does the new premise change the prior unpark trigger?

**It does not weaken it, and it adds one gate.**

The BYO-Claude premise was attractive because it appeared to remove the prior council's third gap — "no scalable, metered, cost-isolated AI backend." Constraint 1 shows it does not: pushing inference onto a user's *subscription* is prohibited in app form, and pushing it onto their *API key* is permitted but is still an AI backend we must design, meter and support. The gap is relocated, not closed. The other two gaps — no multi-tenant data model, no self-serve OAuth — are untouched by this premise; RLS is still disabled on every table and Meta still requires App Review and Business Verification.

So the trigger stands as written: **8–10+ verbal or deposit commitments at a stated price from non-Meghan users, hand-provisioned, before any auth, billing, tenancy or OAuth work.** Three amendments:

1. **Add a precondition:** IP resolution with Meghan must close *before* the pilot starts. Selling commitments against something we may not own is the one failure here that is genuinely irreversible.
2. **The stated price must be the product-only price** ($15–35/mo), quoted with the inference arrangement disclosed. A commitment obtained by implying free or bundled Claude is not a valid signal.
3. **The pilot must not grant access to the current single-tenant build.** With RLS off and no `user_id`, a pilot user with the URL can spend Meghan's subscription and see her data. Run the pilot as a manual service — Levi operates the flow, delivers the storyboard — which tests demand for the *output* without shipping the *architecture*. This is strictly lower-risk than the original trigger contemplated and costs nothing extra.

**Downside shape, stated plainly:** the reversible failure is spending Levi's October–January evenings and learning nobody pays — cheap, and the manual-pilot condition caps it. The irreversible failures are a Meghan IP dispute during a live client engagement, and an Anthropic ToS breach on the studio's own account. Both are avoidable by the conditions above; neither is avoidable by proceeding with the idea as the brief poses it.

---

# SEAT: FINANCE (sonnet) — blind pass

## Verdict
**PARK**

## Three strongest reasons
1. **The desktop-companion constraint kills the "download an app" premise.** Constraint #1 is explicit: subscription-powered Claude Code only works as a *desktop* companion running the real binary with the user's own login; "a phone app cannot run it." The brief's product is a mobile-first PWA. A phone-only "bring your own Claude subscription" app is not compliant — only API-key billing works on phone, which is a different monetization model than the one the brief proposes.
2. **Zero willingness-to-pay evidence, and the one data point (Meghan) is a non-payer.** "The willingness-to-pay has not been tested with anyone except Meghan (who does not pay)." Before touching Meta App Review, tenancy, or OAuth, the prior council's unpark trigger (8–10+ verbal/deposit commitments) has still not been met — this brief doesn't report it as met, only reframes the backend.
3. **Cost-to-build for compliance alone is substantial and time-boxed against a hard calendar wall.** Meta Advanced Access requires App Review + Business Verification (working demo, screen recordings, per-permission proof) — real weeks of solo-founder work — while capacity is already split with paying client work (Sprint 11 active) and blocked by a wedding dead-zone late Sept–mid Oct. Simple math: if Meta review + a minimal multi-tenant OAuth layer is even 3-4 weeks of focused solo work, and only ~6-8 non-dead-zone weeks exist before year-end, that's half the runway before a single pilot user is onboarded.

## Strongest argument against my own verdict
The desktop-companion path is real and does solve the inference-cost problem cleanly: $0 marginal AI cost to the studio, which is the single biggest unit-economics unlock available. If the target segment is redefined as desktop-using solo creators/managers (not phone-first), constraint #1 stops being disqualifying, and the studio could plausibly hit the prior unpark trigger cheaply since it removes the "scalable metered AI backend" gap entirely — that gap was one of the three original blockers.

## Conditions I would attach (owned, dated where possible)
1. **Levi, by 2026-09-19** (before wedding blackout): re-scope the pilot as **desktop-only** (Mac/Windows companion running real Claude Code, user's own login) — not the mobile PWA as briefed — and confirm this is technically compatible with the existing Node-daemon architecture already proven on Meghan's Mac.
2. **Levi, by 2026-09-19:** resolve IP/commercialization rights with Meghan in writing before any pilot outreach — brief flags this as "unresolved," and it blocks even a hand-provisioned pilot.
3. **Levi, before any Meta API work:** run the pilot commitment test (8-10+ verbal/deposit commitments at a stated price) using manual/hand-entered data — no Meta integration needed yet — to avoid sinking App Review effort before demand is proven.
4. **Levi, post-wedding (mid-Oct 2026):** if commitments land, begin Meta App Review only then, sized to one vertical, not "musicians + N others."

## Industries beyond musicians (ranked, minimal rework)
1. **Real estate agents/small teams** — carries over: performance-conditioned content planning, storyboard+asset-prompt flow, checklist habit-loop. Breaks: Booking tab logic (venue outreach) doesn't map; needs listing-photo/video specific prompts.
2. **Fitness/wellness coaches (solo studios, personal trainers)** — carries over: near-identical to musician use case (personal brand, performance stats, content calendar). Breaks: little — closest analog to Meghan's actual usage pattern.
3. **Independent restaurants/cafes** — carries over: Stats tab, Checklist, daily-insight loop. Breaks: multi-person posting (not solo creator), storyboard prompts need menu/ambiance-specific tuning, Booking tab irrelevant.

Brief provides no data confirming any of these beyond the stated "solo creators and very small businesses" hypothesis — this ranking is my own inference from feature overlap, not brief fact.

## Best first target segment + concrete channel
**Fitness/wellness solo coaches** — closest structural match to the proven Meghan use case (solo personal brand, IG/FB-only, performance-driven content). Channel: **the same weekly Gmail-outreach mechanism already built for Booking**, repointed at a manually-curated list of local personal trainers/coaches found via Instagram business-account search — zero new infrastructure, reuses proven code, matches the "hand-provisioned pilot, no self-serve signup" unpark condition exactly.

## Monetization recommendation
Given users may pay Anthropic directly: **flat subscription decoupled from inference cost**, since the studio bears $0 AI marginal cost under the desktop-companion model. Estimate: if run cost is Supabase + hosting only (~$25-50/mo fixed regardless of user count at pilot scale), price at $25-35/mo per solo user (undercutting Later/Metricool's AI-less tiers while offering a materially different output). At 100 users (the 12-month "win" target) × $30/mo = $3,000 MRR against near-zero variable cost — but this assumes the desktop-only pivot in Condition #1; the brief's phone-app framing has no compliant monetization path at all under constraint #1.

## Does the new premise change the prior unpark trigger? How?
**Partially, not wholesale.** The prior trigger required "8-10+ verbal/deposit commitments... before any auth/billing/tenancy/OAuth work" — that condition is unchanged and unmet by this brief. What the new premise *does* change: the third original gap ("no scalable, metered, cost-isolated AI backend") is structurally resolved if-and-only-if the product pivots to desktop-companion delivery — the studio no longer needs to build or fund metered inference at all. But this is a trade, not a free win: it converts an engineering gap into a **platform-shape constraint** (must be desktop, not the phone-first PWA the studio already built and the brief assumes). The unpark trigger's commitment-count and no-tenancy-engineering conditions stand exactly as before.

---

# PEER RANKING (anonymized; key: A=Risk B=Ops C=Finance D=Market E=Craft)

| Ranker | 1st | 2nd | 3rd | 4th |
|---|---|---|---|---|
| Market (D) | A | E | C | B |
| Craft (E) | A | D | C | B |
| Ops (B) | A | E | D | C |
| Risk (A) | E | D | C | B |
| Finance (C) | A | E | D | B |

Consensus points (named by ≥3 rankers):
- A's separation of *branding* ("your Claude subscription", prohibited) from *architecture* (user-funded inference via API key, permitted) is the correct cut.
- A's condition: no pilot user may touch the current single-tenant build (RLS off, no user_id) — run the pilot as a manual concierge service, testing the OUTPUT without shipping the ARCHITECTURE.
- E's cold-start problem: the differentiator (tips + performance-conditioned recommender) is seeded from one account; user #2 on day one gets the generic experience the hypothesis says buyers hate. Every other seat says they missed it. A demo run on Meghan's history measures something no new customer will experience.
- B's C1 (reproduce the logged-in daemon on a second machine, second Claude account, unattended one week) is the best single test proposed — despite B's verdict being ranked last.
- Weakest load-bearing claims: C's "$0 marginal cost → 100 × $30 = $3,000 MRR" (ignores support cost of per-user daemons and that the cost is transferred onto a customer account Anthropic can enforce against); C's invented runway arithmetic; C's proposal to reuse Meghan's Booking/Gmail rig for studio prospecting (IP conflict); B's verdict contradicting its own self-critique.

---

# REBUTTAL ROUND (Ops seat, sole dissenter, given Answer A)

**REVISE.** New verdict: **PARK** (on the idea as posed). A's core point defeats my framing: I treated "desktop companion" as a condition-gated variant of the same product, but A is right that the brief's product *is* the mobile-first PWA, and Constraint 1 makes the phone-first BYO-Claude-subscription premise non-compliant outright, not merely risky. My conditions were doing PARK's job while my label said PROCEED — a labeling error, not a substance error. Surviving conditions relocated into the PARK: C1 (second-machine daemon reliability test) becomes the technical precondition before the "own Claude" architecture is ever offered; C4 (IP in writing) is the absolute first gate; C2/C3 (Sprint 11 protection, wedding blackout) survive as calendar constraints. What the council would be wrong about if it parks *without* C1: treating "run real Claude Code locally, user logs in themselves" as a solved compliant path rather than an unproven one.

---

# PREMORTEM LOG — five passes, fresh opus seat each round

| Round | Input | Verdict | Material findings | Outcome |
|---|---|---|---|---|
| 1 | v1 | NOT CLEAN | 8 gaps + 5 contradictions (C3/C7 Meta-data conflict; pilot measures Levi; no cap numbers; no sample-size rule) | v2 |
| 2 | v2 | NOT CLEAN | 4 of 5 new gaps caused by round-1 patches colliding (60 h cap vs 20 demos; $99 concierge ≠ $29 product; no cold-start pass criterion; close-rate assumption) | v3 |
| 3 | v3 | NOT CLEAN (wording only) | Pre-orders with no refund term; stop rule below required pace; cold-start fail had no consequence; "verbal" vs paid contradiction | v4 |
| 4 | v4 | NOT CLEAN (one item) | C5 met + C10 sample shortfall = KILL on a succeeding run | v5 |
| 5 | v5 | **CLEAN** | none | final |

Round 5 verification: patch present, no new contradiction with C5, C0 slide, or C2 refund term; C9 and C10 stop rule still bind independently.
Detail files: PREMORTEM-1.md, PREMORTEM-2.md, PREMORTEM-3.md.

---

# PREMORTEM ROUND 1 (opus, fresh seat, read BRIEF + SYNTHESIS v1) — verdict NOT CLEAN

Gaps found and patched into v2:
1. Concierge pilot tests Levi, not the product → new C9 reproducibility rule (no hand edits count; >2/10 corrected = product fail).
2. Founder-hours cap had no number/owner → C5 now 60 h / $500, logged weekly, breach = stop + council entry.
3. IP stall + quiet extension risk → C0: counsel-drafted instrument, decline branch costed, kill is a decisions.md entry, no outreach before signature.
4. Cold-start test timing → C3 now runs on one real account before first paid outreach.
5. C3 vs C7 contradiction (pilot needs user's Meta data; C7 forbade processing it; also collides with "no Meta App Review") → C3: user supplies exports/screenshots or reads under own login on own device, studio stores nothing and calls no Meta API; C7 rescoped to the product post-trigger.
6. Commercial Terms / entity before first paid job → new C11.
7. Null result from too few conversations → new C10 (20 qualified demos; null = KILL).
8. Pitching from Meghan's build/name → channel: neutral codename, demo on pilot user's own data, never Meghan's brand/build.
Contradictions: C0 vs channel dates (fixed: outreach prohibited before signature); C5 unmeasurable (fixed); C6 inert (kept, labelled inert until trigger); C2 service-vs-product signal (fixed: invoice as product pre-order).

---

# PREMORTEM ROUND 2 (opus, fresh seat, read BRIEF + SYNTHESIS v2 + PREMORTEM-1) — verdict NOT CLEAN

Patch audit: 6 of 8 round-1 patches closed; C9 (input curation unpoliced) and C5 (cap arithmetic) still open.
New gaps, patched into v3:
1. C5 60 h vs C10 20 demos vs C9 10 deliveries over-committed → C5 = 120 h, sized (2 h/demo, 2 h/delivery); legal fees moved to a separate written legal budget.
2. Window ~9 weeks if IP signs late Nov → C0: unsigned by 2026-11-01 slides the pilot deadline to 2027-03-31 by the same written act; no other extension.
3. $99 concierge commitments ≠ $29 product demand → pilot commitment asked at $29/mo product price, concierge delivery disclosed as temporary + free; monetization section updated.
4. 40–50% close rate demanded of a non-salesperson → C10 logs demos and closes separately; <3 closes in first 10 demos = stop and re-vet the sales motion (a sales finding, not a product one).
5. Cold-start test had no pass criterion → C3: ≥2 account-specific numbers cited + photographer's written "I'd actually post this."
6. Asking a paying client for IP mid-sprint → ACCEPT (unavoidable); C0 now frames it as a design-partner offer.
C9 input boundary: hand-correction = any change to inputs or outputs after numbers entered; raw input file saved per job.

---

# PREMORTEM ROUND 3 (opus, fresh seat, read BRIEF + SYNTHESIS v3 + rounds 1–2) — verdict NOT CLEAN (wording only, nothing structural)

Patch audit: 5 of 7 round-2 patches closed; C10 threshold and C3 fail-branch still open.
Material gaps, patched into v4:
A. Pre-orders with no refund/delivery term → C2: named delivery date + refund-in-full on KILL or undelivered; refunds inside the $500 cap.
B. 3-in-10 stop rule below the pace the trigger needs → C10: fewer than 4 closes in first 10 = stop.
C. Cold-start fail had no consequence → C3: failed test halts outreach until council re-vets.
D. Levi's identity leaks Meghan in person → ACCEPT (listed under accepted residual risks).
Contradictions: "verbal" commitments in trigger vs paid-only in Monetization → "verbal" struck from the trigger. C5 cap vs C0 slide → slide does not increase the cap.

---

# COUNCIL SYNTHESIS — Playbook as a downloadable, bring-your-own-Claude product

Chairman: Fable. Date: 2026-09-03. Seats: Market (opus), Craft (opus), Ops (sonnet), Risk (opus), Finance (sonnet). Blind pass → anonymized peer ranking → one rebuttal round. Version: v5 (after premortem rounds 1–4; round 5 verification CLEAN — see PREMORTEM-LOG.md).

## Verdict: PARK — and KILL one specific mechanism

**Final: PARK** the product for public release, 5 of 5 seats after the rebuttal round (Ops revised from PROCEED-WITH-CONDITIONS, calling its own label "a labeling error, not a substance error"). Peer ranking placed the Risk seat first with every other seat, and the council adopts its cut: **the mechanism the brief proposes — users type their Claude subscription credentials into our app — is KILLED, not parked.** Anthropic's own Claude Code legal page prohibits third-party developers from offering Claude.ai login, routing requests through Pro/Max credentials on a user's behalf, or collecting/storing/intermediating Claude.ai credentials or session tokens. There is no compliant version of that sentence, and Anthropic reserves enforcement without notice. The ghost should not return: any future design that asks a user to paste a Claude login is refused at review, permanently.

The prior council's PARK (2026-08-03) stands. The new premise ("user brings their own Claude") relocates the AI-backend gap; it does not close it, and it leaves the other two gaps (multi-tenant data model, self-serve Meta OAuth) untouched.

## What the council found that the brief did not know

1. **Three Anthropic-compliant shapes exist; the brief's is not one of them.** (a) Studio API key, metered per user — ordinary SaaS, phone-friendly, the default. (b) User's own **API key** (not subscription), billed to them by Anthropic — permitted, phone-friendly, an option. (c) A desktop companion that runs the **unmodified Claude Code program**, where the user signs in through Anthropic's own flow and the app never sees credentials — permitted under Anthropic's Commercial Terms, desktop-only, and today's Meghan setup. Shape (c) is fragile by the repo's own record (runs only while logged in; earlier variant failed 100%), has never been completed by anyone but Meghan, and Anthropic's advertised subscription limits "assume ordinary, individual usage." It may be offered only as a power-user option, never as the pitch, and only after the test in condition 6 below.
2. **The cold-start problem** (Craft; every other seat said it had missed it). The differentiator — "plans from your own performance data" — is carried by 210 tips and a recommender seeded from one account's history. User #2 on day one has no history, no tips, no signal: exactly the generic experience the demand hypothesis says buyers hate. A pilot demo run on Meghan's data measures something no new customer will experience.
3. **The pilot cannot use the current build.** Access is an unguessable URL over tables with RLS disabled and no `user_id`; a pilot user with the link can read Meghan's data and spend her subscription. The demand test must be a **manual concierge service** — Levi runs the flow, delivers the storyboard — testing the *output* without shipping the *architecture*.
4. **Ownership is unresolved and is the one irreversible failure.** Built as client-funded work; the 210-tip corpus and prompt register are mined from Meghan's account. Three seats independently made written IP resolution the absolute first gate.

## Industries beyond musicians — council aggregate

Ranked by rework distance and platform fit across five seats (no seat had market-size data; none is claimed here):

| Rank | Segment | Carries over | Breaks |
|---|---|---|---|
| 1 | **Solo fitness / yoga / wellness instructors** | Whole planning loop, Stats, Checklist, Business accounts already the norm, class cadence ≈ show cadence | Booking (no venue analogue — dead weight or repurposed to class/retreat promotion); tips corpus re-mined |
| 2 | **Wedding & portrait photographers, solo creative-service businesses** | Everything visual; storyboard + asset prompts fit a portfolio feed; Booking maps to *client inquiry pipeline*; demonstrably buy tools | Booking is a rewrite not a rename; they expect scheduling/publishing, which we don't do; tips corpus |
| 3 | **Adjacent live performers** (comedians, DJs, drag, touring poets, small venues/promoters) | Nearly all of it, Booking included | Smallest and poorest market; closest to the segment we already can't price |
| 4 | **Solo social-media managers running 3–8 accounts** | Stats, creation flow, Checklist, Booking ≈ client prospecting; highest willingness to pay ($59–99 tier credible); Mac-based, tolerate a companion | Needs multi-account = the exact tenancy work that is parked; tips must become per-client. **This is the post-unpark revenue tier, not the first target.** |
| 5 | Visual artists / illustrators, tattoo artists, barbers | Creation flow, Stats, Checklist | Booking useless; tips wrong |
| 6 | Restaurants, cafés, breweries | Stats, storyboard, event-driven posting | Multiple staff on one account (no login/roles = disqualifying); cadence too high for a 40–100 s path |
| 7 | Realtors, personal-brand coaches | Generation flow only | Compliance-constrained copy, listing feeds expected, want volume + scheduling — the opposite of the wedge |

## Best first target and channel (chairman's tie-break)

Seats split four ways (SMMs ×2, photographers, fitness, musicians' peer network). Ruling: **independent wedding & portrait photographers on the Colorado Front Range.** Reasons: they demonstrably pay for tools; the storyboard-plus-asset-prompt output is legible to them on sight, which shortens a one-person sell; they hold Business accounts with post history, so the cold-start test in condition 3 is real rather than faked; Booking's shape (outreach → reply → pipeline) survives as an inquiry pipeline; and they are reachable in person. SMMs are deferred because they require tenancy; musicians' peer network is deferred because it re-uses Meghan's relationships before IP is settled. **Channel:** in person and hand-picked — Colorado wedding-vendor mixers and a regional photographers' guild meetup between 2026-10-20 and 2027-01-31, enough of them to reach **20 qualified demos** (condition 10), a live storyboard demo from a laptop on *their* numbers, and a named price asked on the spot. Outreach uses a neutral working codename and a demo built on the pilot user's own data — never Meghan's name, brand, account or build. No ads, no funnel, no self-serve anything.

## Monetization

Unanimous on structure; numbers reconciled by the chairman.

- **Never** "powered by your Claude subscription," never a BYO-subscription tier, never a discount for bringing your own inference, never revenue share on tokens, never any pricing that implies we supply the model. The user paying Anthropic changes our cost basis, not the product's value — and an Anthropic policy change must break an *option*, not the business.
- **Pilot (through the unpark trigger):** the commitment is asked at the **$29/mo product price** — the same price the product will carry — with concierge delivery disclosed as temporary and free during the pilot, and inference on the studio's own API key (shape a). A paid first month or deposit at $29 is the only demand signal that counts; a commitment at a higher "done-for-you" price measures Levi's labor, not the product, and does not count. At pilot scale the token cost is a rounding error against the information value.
- **Post-unpark:** **$29/mo solo** (product-only price, hard monthly generation quota, studio API key) and **$79/mo manager** (3–8 accounts) — the manager tier ships only after tenancy exists. **BYO API key** offered at the *same* price with the benefit framed as higher quota and "your data never touches our key." Metered overage is deferred until after the pilot because the unpark trigger requires a *stated* price. Ops's $10–15/mo "inference is free" price is rejected: under any user-funded shape the real variable cost is founder support time, and nothing at $12/mo pays for it.

## Amended unpark trigger

The 2026-08-03 trigger stands in count and sequence (8–10+ commitments at a stated price, hand-provisioned, before any auth/billing/tenancy/OAuth work), with one tightening: **"verbal" is struck — only a paid first month or deposit at $29 counts.** Amendments, all owned by Levi:

0. **Precondition — IP in writing with Meghan.** An instrument drafted by counsel (assignment or commercial licence) covering the codebase, the tip corpus and the prompt register, or written confirmation the corpus is excluded and rebuilt; Meghan's role (design partner / case study #1 / revenue share) named. Target 2026-09-20; hard kill of the whole line if unsigned by 2026-11-30 — the kill is a decisions.md entry, not a quiet extension. If it is unsigned by 2026-11-01, the pilot deadline in conditions 5 and 10 moves from 2027-01-31 to 2027-03-31 by the same written act; no other extension exists. Counsel's fee sits in a separate written legal budget set before the instrument is drafted, outside the pilot cash cap. If Meghan declines, the corpus-excluded rebuild branch is costed in hours *before* anything proceeds. Nothing else starts, including naming the product; outreach before signature is prohibited. The relational risk of asking a paying client for an assignment mid-Sprint 11 is accepted as unavoidable and is raised as a design-partner offer, not a demand.
1. **Nothing before 2026-10-20** (wedding dead zone) and nothing that borrows time from megcmusic Sprint 11 without the client's written reprioritization.
2. **Manual concierge pilot only.** No pilot user is ever given access to the current build. No tenancy, auth, billing, OAuth or Meta App Review work before the trigger. The pilot is priced and invoiced as a product pre-order at $29/mo, not a service retainer: the invoice names the product-only price, says the concierge delivery is temporary and free, names a delivery date for the self-serve product, and carries a **refund-in-full term** triggered by any KILL entry or by that date passing undelivered. Refunds sit inside the $500 cash cap.
3. **Cold-start rule.** Every pilot recommendation and storyboard is conditioned only on *that user's* own performance numbers plus the generic rule set — never on Meghan's tips. Those numbers are supplied by the user as Insights exports or screenshots, or read live under the user's own Meta login on their own device during the demo; the studio stores no other person's Meta data and calls no Meta API on their behalf. **The cold-start test runs on one real photographer account before the first paid outreach**, against a pass criterion written before the test: the first recommendation must cite at least two specific numbers from that account, and the photographer must judge it, in writing, as something they would actually post. Fail that, and the product is a tips library, not a co-pilot — that is the finding, it is filed, and **outreach halts: no demo occurs until the council re-vets.**
4. **Stated price = product-only price with the studio carrying inference**, inference arrangement disclosed. A commitment obtained at a BYO price, or by implying free or bundled Claude, does not count.
5. **8–10+ commitments by 2027-01-31 or the line dies.** Downside cap, set now: **120 founder-hours and $500 cash** across the whole pilot, legal fees excluded (condition 0). Sizing: ~2 h per demo × 20 demos, ~2 h per delivered storyboard × 10, plus the cold-start test and logging. Levi may revise the numbers in writing before the first outreach, never after; a deadline slide under condition 0 does not increase the hour or cash cap. Levi logs hours weekly in the pilot file; on breach, stop and file a council entry before any further hour is spent.
6. **Before shape (c) is ever offered as an option:** reproduce the logged-in Claude Code companion on a second machine with a second Claude account, unattended for one week, and time a non-technical stranger's cold install to first storyboard (under 15 min passes; over 30 min kills the option for good). Inert until the trigger clears; it is not a pilot step.
7. **Before the product itself processes any non-Meghan Meta data** (i.e. post-trigger, at the first line of OAuth work): ToS, privacy policy, a named legal entity, and Gate 3 closed on the playbook surface (Home LCP 6.8 s).
8. **Standing policy watch:** re-read Anthropic's Claude Code legal page at every sprint close; any change to the permitted shapes triggers a re-vet.
9. **Reproducibility rule (the pilot measures the product, not Levi).** A hand-correction is any change to prompt **inputs or outputs** after the user's numbers are entered; Levi saves the raw input file per job, and every output must be reproducible by re-running the saved prompt chain unedited. Hand-corrected outputs are logged and do not count toward the trigger; if more than 2 of 10 delivered storyboards needed a hand-correction, the trigger fails on product grounds regardless of the commitment count.
10. **Sample-size and sales-motion rule.** Minimum 20 qualified in-person demos (a photographer with a Business/Creator account who saw a storyboard on their own numbers) by 2027-01-31 (or 2027-03-31 under condition 0's slide). Demos and closes are logged separately. Fewer than 20 demos makes the result null, not negative — and null is a KILL, not an extension, unless the condition-5 commitment count is already met, in which case the trigger stands and the demo shortfall is logged. **Fewer than 4 closes in the first 10 demos = stop and re-vet the sales motion** (8–10 of 20 needs 4–5 per 10; a slower pace cannot reach the trigger inside the cap) (pitch, price framing, who is in the room) before spending the remaining hours; that is a sales finding, not a product one, and is filed as such.
11. **Before the first invoiced pilot job:** Anthropic Commercial Terms accepted by the studio for its API key, and a named legal entity on the invoice.

## Where the reconvene signal comes from

The council reconvenes when Levi reports, in writing, (i) the IP instrument signed and (ii) the commitment count with names, prices and dates. Either one failing by its date is a KILL entry, not a quiet lapse.

## Accepted residual risks (no condition can remove them)

- Asking a paying client for an IP instrument mid-Sprint 11 carries relational risk; framed as a design-partner offer, and it must happen first regardless.
- Levi's identity links to Meghan's site in any in-person demo; bounded because condition 0 bars outreach before signature.
- Anthropic can change the permitted shapes without notice; condition 8 detects, it cannot prevent.

## Not covered — flagged by the chairman

No seat had market-size data for any vertical; the ranking is fit-and-rework only. No seat costed the Meta App Review + Business Verification path in hours; it is deliberately behind the trigger. Windows users are unaddressed by shape (c); shapes (a) and (b) cover them.
