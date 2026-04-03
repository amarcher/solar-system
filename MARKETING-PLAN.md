# Marketing Plan: Space Explorer

**Generated**: 2026-04-03
**Focus**: Full
**App**: Space Explorer — 3D interactive solar system explorer with AI voice guide for kids, parents, and teachers
**URL**: https://spaceexplorer.tech
**Stack**: Vite 8 + React 19 + TypeScript + Three.js / React Three Fiber + ElevenLabs
**Category**: Educational/Reference
**Target Audience**: Kids (ages 6-14), parents looking for educational screen time, homeschool families, K-8 science teachers

---

## 1. SEO Strategy

### Keyword Targets

| Keyword | Difficulty | Intent | Notes |
|---------|-----------|--------|-------|
| 3D solar system for kids | Low-Medium | Educational | Few direct competitors. Strong fit. **Primary target.** |
| interactive planets for kids | Low-Medium | Educational | Long-tail, low competition. Combines two strong intent signals. |
| solar system game for kids | Medium-Low | Educational/Fun | NeoK12 and app stores dominate, but few free web-based options. |
| space education website | Medium-Low | Informational | ESA Kids, NASA Space Place rank but phrase is undersaturated. |
| solar system explorer | Medium | Navigational | NASA's "Solar System Exploration" dominates. Domain partially matches. |
| learn about planets | Medium | Informational | Long-tail opportunity with "learn about planets online" / "interactive." |
| interactive solar system | Medium-High | Educational | Solar System Scope ranks #1. Established players but no kid-focused competitor. |
| solar system for kids | High | Educational | Dominated by NASA Space Place, Britannica Kids, NatGeo Kids. Long-term goal. |
| planets for kids | High | Educational | planetsforkids.org owns exact-match domain. Aspirational. |

**Strategy**: Target low/medium long-tails first ("3D solar system for kids", "interactive planets for kids") for early wins, then build authority toward high-volume head terms.

### Content Strategy

Space Explorer is an SPA with no indexable per-planet pages. Two options:

**Option A — Static landing pages (recommended)**
Generate lightweight HTML pages at `/planets/jupiter`, `/moons/europa`, `/sun`, etc. that:
- Contain the planet/moon's `summary`, `funFacts`, and key properties from `src/data/planets.ts` and `src/data/moons.ts`
- Include a "Launch in 3D" CTA linking to the main app with a nav deep-link
- Are server-rendered or pre-rendered at build time (Vite SSG plugin or a simple build script)
- Each page targets a keyword like "Jupiter facts for kids", "Europa moon facts"

This gives Google 40+ indexable pages (10 planets + ~27 moons + Sun) instead of one.

**Option B — Blog/resource pages**
Add a `/learn` section with articles like:
- "How Big Are the Planets? A Size Comparison for Kids"
- "What Would You Weigh on Jupiter?"
- "Why Does Saturn Have Rings?"

These target how-to and curiosity queries that parents and teachers search for.

### Backlink Opportunities

1. **Product Hunt** — Primary launch platform. Best days: Tue-Thu. Prepare a compelling first comment explaining the AI voice guide differentiator.
2. **AlternativeTo** — Solar System Scope has 25+ alternatives listed. Add Space Explorer as a free, kid-focused alternative.
3. **Hacker News (Show HN)** — Technical audience will appreciate Three.js/R3F + AI voice integration.
4. **Indie Hackers** — Share the "forked from periodic table" platform validation story.
5. **Homeschool directories** — Homeschool.com, Home Educators Resource Directory, Homeschool Resource Finder (8,500+ members).
6. **eLearning Industry** — Lists 324+ free tools for teachers. Submit for inclusion.
7. **Teacher bloggers** — Pitch to education bloggers who review free classroom tools. Search for "best solar system websites for kids" roundup posts and request inclusion.
8. **Common Sense Education** — Widely trusted by teachers. Submit when they resume edtech reviews.

### Internal Linking

Not applicable until per-planet landing pages exist (Option A above). Once built:
- Each planet page links to its moons
- Each moon page links back to parent planet
- All pages link to the main 3D app
- Sun page links to related planets (inner/outer solar system)

### Technical SEO

Current meta tags, OG/Twitter cards, ads.txt, and Vercel config are already in place. For auditing or updating, run `/seo-optimization audit`.

---

## 2. Reddit Strategy

### Target Subreddits

| Subreddit | Members | Angle | Priority |
|-----------|---------|-------|----------|
| r/InternetIsBeautiful | ~17M | "I built a 3D interactive solar system you can explore" | **#1 — launch here first** |
| r/space | ~30M | Share as a free educational tool for kids | High volume, strict mods |
| r/Parenting | ~5M | "Looking for educational screen time? My kid loves this" | High-intent parents |
| r/Astronomy | ~2.8M | "Interactive way to teach kids about the solar system" | Engaged audience |
| r/webdev | ~1M | "I built a 3D solar system with React Three Fiber" — technical showcase | Dev audience |
| r/reactjs | ~400K | Technical deep-dive on R3F + React 19 + ElevenLabs architecture | Dev audience |
| r/Homeschool | ~100-200K | "Free interactive solar system for your curriculum" | **Highest-intent audience** |
| r/Teachers / r/ScienceTeachers | ~500K / ~50K | "Free classroom resource — 3D solar system with AI voice guide" | Teachers share tools |
| r/edtech | ~50K | AI voice guide for kids learning — educational technology angle | Niche but engaged |
| r/threejs | ~50K | Technical showcase of the 3D implementation | Niche dev audience |

### Post Drafts

**Draft 1 — r/InternetIsBeautiful (Resource Share)**

> **Title**: A 3D solar system you can click through — planets, moons, the Sun's layers
>
> Built this as a free browser tool for exploring the solar system. You can click any planet to see its details, explore its moons, and peel back the layers of the Sun. There's also an AI voice guide you can talk to if you want to ask questions about what you're looking at.
>
> https://spaceexplorer.tech
>
> Works on desktop and mobile. No login, no ads (yet), nothing to install.

**Draft 2 — r/Homeschool (Value-First)**

> **Title**: Free 3D solar system tool for science units — my kids have been using it
>
> I've been working on an interactive solar system explorer that might be useful for anyone doing a space/astronomy unit. It's a 3D model in the browser where kids can click planets to see facts, surface gravity, orbital period, fun facts, and notable moons. There's also an AI voice guide they can talk to and ask questions.
>
> It covers Mercury through Neptune plus Pluto, Ceres, and 27 moons. Each planet has real NASA textures.
>
> https://spaceexplorer.tech
>
> What tools are you all using for science right now? Always looking for ideas.

**Draft 3 — r/webdev (I Built This)**

> **Title**: Built a 3D solar system explorer with React Three Fiber, Three.js, and an AI voice guide
>
> Wanted to share a side project I've been working on. It's an interactive solar system explorer aimed at kids (6-14) that runs entirely in the browser.
>
> Tech stack: React 19 + Three.js via React Three Fiber for the 3D scene, custom GLSL shaders for the Sun, instanced meshes for the asteroid belt and starfield, and an ElevenLabs voice agent that acts as a space guide kids can talk to.
>
> Some things I learned:
> - Keeping the R3F Canvas always mounted and using HTML overlay dialogs for detail panels was way better than unmounting/remounting the 3D scene
> - sqrt-compressed orbits and log-scaled radii are essential — real proportions make the inner planets invisible
> - The ElevenLabs client tools pattern (voice agent triggers navigation) works surprisingly well for hands-free exploration
>
> https://spaceexplorer.tech
>
> Happy to answer questions about the R3F architecture or the voice agent integration.

### Posting Schedule

| Day | Subreddit | Post Type |
|-----|-----------|-----------|
| Day 1 (Tue) | r/InternetIsBeautiful | Resource Share (Draft 1) |
| Day 4 (Fri) | r/Homeschool | Value-First (Draft 2) |
| Day 8 (Tue) | r/webdev | I Built This (Draft 3) |
| Day 11 (Fri) | r/space | Adapted Draft 1 |
| Day 15 (Tue) | r/Teachers | Adapted Draft 2 |
| Day 18 (Fri) | r/Parenting | Adapted Draft 2 with parent angle |
| Day 22 (Tue) | r/reactjs | Adapted Draft 3 with more R3F detail |
| Day 25 (Fri) | r/Astronomy | Adapted Draft 1 |

**Rules**: No marketing language. Sound like a person sharing something they made. Always provide value before the link. Include a question that invites discussion.

---

## 3. Facebook Ads Strategy

### Target Audience

- **Primary**: Parents of kids ages 6-14, interested in: STEM education, homeschooling, science activities, educational apps, space/astronomy
- **Secondary**: K-8 teachers, interested in: classroom technology, science curriculum, free teaching resources
- **Demographics**: Ages 28-50, US/UK/CA/AU, both genders (skew slightly female for parenting, balanced for teachers)

### 3-Phase Campaign

#### Phase 1 — Seed ($15/day, weeks 1-2)
- Install Meta Pixel on spaceexplorer.tech (add to `index.html`)
- Create Custom Audience from site visitors who spend >30 seconds
- Target: Interest in "STEM education" + "Homeschooling" + "Space" + parents of kids 6-14
- Single ad creative, optimize for link clicks
- Goal: 500+ pixel events to seed lookalike audiences

#### Phase 2 — Lookalike ($50/day, weeks 3-6)
- Build 1% Lookalike from Phase 1 converters (>30s engagement)
- Layer interests: "Science education" OR "Kids apps" OR "NASA"
- A/B test 3 ad creatives (below)
- Optimize for landing page views (not link clicks)
- Goal: <$0.50 CPC, >2% CTR

#### Phase 3 — Retarget ($10/day, ongoing)
- 7-day pixel retargeting: users who visited but didn't engage with a planet detail
- Video viewer retargeting: users who watched >50% of any ad video
- Dynamic creative optimization (DCO) rotating headlines

### Ad Creatives

**Ad 1 — Curiosity Hook**
- Headline: "What weighs 1.9 octillion kg?" (34 chars)
- Body: "Let your kids explore Jupiter and every planet in a free 3D solar system. Talk to an AI space guide." (101 chars)
- CTA: Learn More
- Visual: Screen recording GIF of clicking Jupiter, seeing detail panel

**Ad 2 — Parent Problem-Solution**
- Headline: "Screen time they'll learn from" (30 chars)
- Body: "A free 3D solar system explorer with an AI voice guide. Built for curious kids ages 6-14." (90 chars)
- CTA: Explore Now
- Visual: Kid-friendly screenshot of the full solar system view

**Ad 3 — Teacher/Homeschool**
- Headline: "Free solar system for your class" (32 chars)
- Body: "10 planets, 27 moons, the Sun's layers. Click to explore, or ask the AI guide. No login needed." (96 chars)
- CTA: Try It Free
- Visual: Screenshot of planet detail panel with fun facts visible

### Conversion Events

Track these with Meta Pixel (instrument in `src/App.tsx` navigation handler and `src/hooks/useNavigation.ts`):

| Event | Trigger | Location |
|-------|---------|----------|
| `PageView` | App loads | `src/main.tsx` |
| `ViewContent` | Planet/Moon/Sun detail opened | `useNavigation.ts` → `navigateTo()` |
| `Lead` | Voice agent activated (first tap) | `src/components/ui/VoiceAgent.tsx` |
| `CompleteRegistration` | User explores 3+ planets in one session | `useNavigation.ts` (track count) |

### Budget Allocation
- 70% Prospecting (Phases 1-2): $45.50/day
- 20% Retargeting (Phase 3): $13/day
- 10% Brand/Testing: $6.50/day
- **Monthly total**: ~$1,950

---

## 4. Metrics & Analytics

### Current Analytics

Already installed in `src/App.tsx`:
- `@vercel/analytics` — page views, top pages, referrers, countries
- `@vercel/speed-insights` — Core Web Vitals (LCP, INP, CLS)

### Recommended Additions

Add **PostHog** (free tier: 1M events/month) for product analytics. Install via:
```bash
npm install posthog-js
```

Instrument in `src/main.tsx` and track custom events in navigation hooks.

### Key Metrics by Funnel Stage

#### Acquisition
| Metric | Target | Source |
|--------|--------|--------|
| Organic search impressions | 1K+/week by month 3 | Google Search Console |
| Referral traffic % | Track top referrers | Vercel Analytics |
| Reddit post CTR | >3% on each post | Reddit post insights |
| Facebook CPC | <$0.50 | Meta Ads Manager |
| Facebook CTR | >2% | Meta Ads Manager |

#### Engagement
| Metric | Target | Source |
|--------|--------|--------|
| Bounce rate | <50% | Vercel Analytics |
| Avg session duration | >90 seconds | PostHog |
| Planets explored per session | >2 | PostHog custom event |
| Voice agent activation rate | >10% of sessions | PostHog custom event on `VoiceAgent.tsx` first tap |
| Detail panels opened per session | >3 | PostHog custom event on `useNavigation.ts` |

#### Retention
| Metric | Target | Source |
|--------|--------|--------|
| D1 return rate | >5% | PostHog |
| D7 return rate | >2% | PostHog |
| Monthly active users (MAU) | 500+ by month 3 | Vercel Analytics |

### Dashboard — Top 5 Metrics

1. **Weekly unique visitors** (are we growing?)
2. **Avg planets explored per session** (are users engaged?)
3. **Voice agent activation rate** (is the differentiator working?)
4. **Bounce rate** (is the 3D scene loading fast enough?)
5. **Top referrer breakdown** (which channels are working?)

### Alert Thresholds

- Bounce rate > 70% — investigate load time, WebGL compatibility
- Voice agent activation < 5% — revisit orb visibility, onboarding prompt
- Avg session duration < 30s — 3D scene may not be loading or engaging
- Facebook CPC > $1.00 — pause and revise targeting/creative

---

## 5. 30-Day Action Plan

| Week | Channel | Action | Expected Outcome |
|------|---------|--------|-----------------|
| 1 | SEO | Submit to Google Search Console. Verify `spaceexplorer.tech`. | Indexing begins, baseline impression data |
| 1 | SEO | Submit to AlternativeTo as Solar System Scope alternative | First backlink from authority directory |
| 1 | Analytics | Install PostHog, instrument navigation events in `useNavigation.ts` | Baseline engagement metrics |
| 1 | Analytics | Install Meta Pixel in `index.html`, configure conversion events | Ready for Facebook Ads Phase 1 |
| 2 | Reddit | Post to r/InternetIsBeautiful (Draft 1) | 5K-50K impressions, 200-2K site visits |
| 2 | Facebook | Launch Phase 1 seed campaign ($15/day) | 500+ pixel events, initial audience data |
| 2 | SEO | Submit to Product Hunt (schedule for Tue/Wed) | Launch day traffic spike, backlink |
| 3 | Reddit | Post to r/Homeschool (Draft 2) and r/webdev (Draft 3) | High-intent teacher/parent traffic + dev community visibility |
| 3 | Backlinks | Submit to Homeschool.com, eLearning Industry, Indie Hackers | 3-5 directory backlinks |
| 3 | Facebook | Review Phase 1 data, launch Phase 2 lookalike ($50/day) | Scaled reach with optimized targeting |
| 4 | Reddit | Post to r/space, r/Teachers, r/Parenting | Broad reach across remaining high-value subreddits |
| 4 | SEO | Begin building per-planet landing pages (Option A from SEO strategy) | 40+ indexable pages for long-tail keywords |
| 4 | All | Review all metrics. Double down on best-performing channel. | Data-driven channel allocation for month 2 |

---

## Competitive Advantage Summary

No existing competitor combines all of Space Explorer's features:

| Feature | Solar System Scope | NASA Eyes | NASA Space Place | Planets For Kids | **Space Explorer** |
|---------|-------------------|-----------|-----------------|-----------------|-------------------|
| 3D interactive | Yes | Yes | No | No | **Yes** |
| Kid-focused (6-14) | No | No | Yes | Yes | **Yes** |
| AI voice guide | No | No | No | No | **Yes** |
| Free, no install | Yes | Yes | Yes | Yes | **Yes** |
| Educational detail panels | No | No | Articles | Text only | **Yes** |
| Moon exploration | Limited | Yes | No | No | **Yes (27 moons)** |

This unique combination is the core marketing message across all channels.
