# Rubin Observatory asteroids: content and app research

Research brief, 2026-09-28. Scope: fact-checked social-content opportunities and a data spike for a "Seen by Rubin" orrery layer. Not a production plan, publishing approval, or merged feature. Production context: the shared space-content playbook in the sister `space-race` repo (`marketing/SPACE-CONTENT-PLAYBOOK.md`). Data outputs and scripts: [rubin-data-spike-2026-09-28/](rubin-data-spike-2026-09-28/).

**Status: research complete. A hand-picked set of 17 objects shipped to the Orrery as the "Rubin Observatory finds" layer (`src/data/rubinAsteroids.ts`); the ~500-object background cloud and a scheduled refresh job are deferred.**

## Recommended story

**How do you find an asteroid nobody has ever seen?** Rubin photographs the same patch of sky twice about half an hour apart: stars stay put, asteroids move. Link a moving dot across a few nights and you have a new world. Payoff: Rubin's real discoveries appear in the Space Explorer orrery, orbiting on today's date.

Strongest supporting hooks, in order: a mountain-sized rock that spins in under two minutes (2025 MN45); 380 new objects beyond Neptune in about six weeks versus ~5,000 in the previous 30 years; Rubin photographed interstellar comet 3I/ATLAS ten days before anyone knew it existed.

## Claim-to-source map

Use these figures, not earlier drafts. Rubin's own pages sometimes disagree; the chosen figure is noted.

| Claim | Use this | Source |
| --- | --- | --- |
| Camera size | 3,200 megapixels, 189 CCDs; "size of a small car," about 3 tonnes (Rubin pages give 2,800–3,060 kg) | [Rubin: camera](https://rubinobservatory.org/explore/how-rubin-works/technology/camera); [key numbers](https://rubinobservatory.org/for-scientists/rubin-101/key-numbers) |
| TVs to show one image | 378 4K TVs (SLAC 2020); Rubin now says "hundreds" | [SLAC](https://www6.slac.stanford.edu/news/2020-09-08-sensors-worlds-largest-digital-camera-snap-first-3200-megapixel-images-slac) |
| Alerts per night | Up to 7 million (not 10 million; the scientists' key-numbers page says ~10M) | [Rubin: LSST begins](https://rubinobservatory.org/news/action-rubin-lsst-begins) |
| Alert speed | First public alerts arrived within two minutes; 60 s is the design goal | [Rubin: first alerts](https://rubinobservatory.org/news/first-alerts) |
| First public alerts | 24 Feb 2026; ~800,000 the first night, to 7 brokers | same |
| Data per night | ~10 TB (not 20); ~30 PB raw over 10 years | [Rubin: numbers](https://rubinobservatory.org/explore/how-rubin-works/numbers) |
| Sky coverage | Visible southern sky every three to four nights; ~800 visits per spot over 10 years | [NSF](https://www.nsf.gov/news/first-imagery-nsf-doe-vera-c-rubin-observatory) |
| Two looks per night | Pairs ~33 minutes apart, usually different filters. Linking needs 2 detections in a night on 3 nights within 15 days | [Survey strategy](https://survey-strategy.lsst.io/baseline/wfd.html); [arXiv 2303.02355](https://arxiv.org/pdf/2303.02355) |
| Telescope speed | Median slew 4.8 s; a new image about every 40 s | key numbers |
| Mirror | 8.4 m combined primary/tertiary, 16,284 kg | key numbers |
| LSST start | 30 June 2026 | [Rubin: LSST begins](https://rubinobservatory.org/news/action-rubin-lsst-begins) |
| Named for a woman | First US national observatory named for a woman (announced 6 Jan 2020) | [LSST release](https://www.lsst.org/news/vro-press-release) |
| Vera Rubin | With Kent Ford, found outer stars in galaxies moving as fast as inner ones: key dark-matter evidence | [Rubin: Vera Rubin](https://rubinobservatory.org/about/vera-rubin) |
| First Look | 2,104 new asteroids in ~10 hours incl. 7 NEOs (June 2025). Other observatories combined find ~20,000/year | [NSF](https://www.nsf.gov/news/first-imagery-nsf-doe-vera-c-rubin-observatory) |
| 11,000 new asteroids | Published 2 Apr 2026. ~1M observations of 11,000+ new and 80,000+ known asteroids over ~6 weeks of summer-2025 testing. 33 new NEOs (none a threat, largest ~500 m), ~380 TNO candidates. MPC: largest single discovery batch of the past year | [Rubin](https://rubinobservatory.org/news/11000-new-asteroids); [NOIRLab](https://noirlab.edu/public/news/noirlab2608/) |
| Future pace | During LSST, ~11,000 new asteroids every 2–3 nights (Rubin projection) | same |
| 10-year totals | Kurlander+ 2025 predicts known totals after LSST: 5.09M main belt, 127k NEOs, 109k Trojans, 37k TNOs (4–9× today). These are totals, not Rubin-only discoveries | [arXiv 2506.02487](https://arxiv.org/abs/2506.02487) |
| Fast spinner | 2025 MN45: ~710 m, one spin every 1.88 minutes, fastest known above 500 m; must be solid rock. First peer-reviewed LSST Camera paper. 19 fast rotators among 76 with reliable periods | [Rubin](https://rubinobservatory.org/news/rubin-record-breaking-asteroid-pre-survey); Greenstreet et al., ApJL, doi:10.3847/2041-8213/ae2a30 |
| Interstellar | Rubin imaged 3I/ATLAS by chance on 21 June 2025, 10 days before its 1 July discovery | [Chandler et al.](https://arxiv.org/abs/2507.13409) |
| Known totals today | ~1.57M minor planets, ~42,500 NEAs, ~2,550 PHAs (MPC summary, apparently last updated ~April 2026) | [MPC summary](https://www.minorplanetcenter.net/mpc/summary) |
| Rubin's MPC code | X05, Simonyi Survey Telescope | [MPC obscodes](https://www.minorplanetcenter.net/iau/lists/ObsCodes.html) |

Unverified: the First Look breakdown (2,015 main belt, 9 TNOs) appears only in secondary reports. The "5–500 interstellar objects" projection appears only in press. No Rubin release found for PHA, Trojan, or comet discovery counts, or for discovery news from July–September 2026.

## What the data shows

Sources were queried directly on 2026-09-28: B612/Asteroid Institute's export of every X05 observation submitted to the MPC, Fink/LSST's SSoFT table, and JPL's SBDB, close-approach and Sentry APIs. Counts are our own joins, not Rubin statements.

- **Data stops at 14 July 2026.** Both the MPC X05 export (regenerated today) and Fink end there. The cause is unknown; possibly a pause or processing hold. Until it resumes, a "recent" feed would show nothing newer than July.
- **Observed:** 8.07M observations of 300,720 objects (Nov 2024 to Jul 2026).
- **Discovered:** 26,713 objects carry Rubin's discovery flag. 23,755 still use Rubin's designation. This exceeds the announced "11,000", which described one six-week batch. Monthly counts peak in June (5,947) and July 2025 (11,398), matching that window.
- **By class (Rubin-discovered):** ~21,700 main belt, 258 Hilda, 217 Mars-crosser, 50 NEOs (0 Atira, 1 Aten, 7 Apollo, 42 Amor), 0 PHAs, 15 Jupiter Trojans, 25 Centaurs, **1,466 TNOs**, 1 comet (P/2026 N2). The Hilda cut is our own.
- **Orbit quality:** 11,629 discoveries have condition code ≤5 and arcs ≥30 days ("plot-safe"). The most exciting extremes are mostly poor orbits: only 37 of 1,466 TNOs and 9 of 50 NEOs are plot-safe.

### Standouts

★ = Rubin discovery. Diameters are estimated from H and an assumed albedo. Full table: [standouts.csv](rubin-data-spike-2026-09-28/standouts.csv).

| Object | Hook | Orbit confidence |
| --- | --- | --- |
| ★2025 LS2 | Swings ~1,000 au from the Sun on a ~12,000-year orbit; among the 30 most distant known minor planets (Rubin release) | Moderate (cc5, 350-day arc) |
| 2025 MX348 | **Do not use as a far-out example.** Rubin's April release named it alongside 2025 LS2 as reaching ~1,000 au, but JPL now links it to 2015 KF176 with a ≈ 39 au, e ≈ 0.14: an ordinary Kuiper belt orbit. A good lesson in how short-arc orbits change | Revised (cc6) |
| ★2025 NE552 | Biggest new find, possibly ~600 km: dwarf-planet-sized candidate | Poor (cc9, 20 days) |
| ★2026 BS14 | Big (~500 km) world tilted 54° | Poor (cc7) |
| ★2025 OX529 | Largest new NEO, ~1 km | Poor (3-day arc) |
| ★2025 PQ124 | Best-determined new NEO; later found in images back to 2004 | Good (cc2) |
| ★2025 OC338 | Tiniest new find, ~11 m, about the length of a bus | Check |
| ★2025 OP161 | Dips inside Venus's orbit | Moderate (cc4) |
| ★2025 OD43 | Its year is almost exactly as long as Earth's (a = 1.042 au) | Check |
| ★P/2026 N2 | Rubin's comet (Encke-type); later found in 2021 images | Good (cc3) |
| ★2025 MP34 | Shares Jupiter's orbit (Trojan), ~4 km | Good (cc1) |
| ★2025 NE203 | Centaur roaming near Neptune's distance, ~210 km | Check |
| 2025 PN7 | Earth's quasi-moon, imaged by Rubin (not its discovery) | Good |
| 3I/ATLAS | Interstellar visitor, hyperbolic (e = 6.14) | Good |
| 434620 (2005 VD) | Orbits the Sun backwards (i = 172°) | Good |
| 535844 | Known PHA passing 9.2 lunar distances from Earth on 2027-03-04 | Good |

**Handle with care:** ★2026 GN18 (~0.7–0.8 km NEO) is on JPL Sentry at 1 in 72 million for 2054–2118, from a 4-day arc. Tiny initial odds on short arcs usually drop to zero after follow-up. Do not feature it in children's content. Rubin reports its 33 new NEOs pose no threat.

## Content opportunities

| Rank | Concept | Effort | Payoff |
| --- | --- | --- | --- |
| 1 | How do you find an asteroid nobody's seen? | Medium (needs orrery layer) | Two-snapshot flip, then real Rubin finds orbiting in the app |
| 2 | A mountain that spins in under two minutes | Low–medium | Scale comparison of 2025 MN45 with a day on Earth; why rubble piles fly apart but MN45 doesn't |
| 3 | 30 years vs six weeks | Low | Counter animation: ~5,000 TNOs over three decades, then 380 more in six weeks |
| 4 | It photographed a visitor before anyone knew it was there | Medium | 3I/ATLAS path through the orrery (hyperbolic) |
| 5 | 1,000 times farther than Earth | Medium | Zoom out from the planets to 2025 LS2's orbit; log scale must be labeled |
| 6 | The camera the size of a car | Low | 378 TVs, 7 million alerts, 10 TB a night: a numbers carousel |

Carousel/Short spin-offs: Vera Rubin and dark matter; Earth's quasi-moon; an asteroid whose year matches ours; a backwards-orbiting centaur.

Non-Rubin ideas raised in the same session, using features that already exist (facts not yet sourced):

- **Where was Earth on the day you were born?** Orrery date picker; comment prompt "drop your birthday."
- **Meteor showers are comet crumbs.** Orionids (~21 Oct, Halley's debris); Geminids (~13–14 Dec, from asteroid 3200 Phaethon), which link back to the asteroid series.
- **Tonight's sky** Shorts from Sky mode, as a weekly recurring slot.
- **Ask Stella:** a kid-style question answered by the voice guide, screen-recorded.
- **Formats:** fact carousels (saves and teacher shares), a weekly "Rubin found this" slot once the layer ships, and YouTube long-form made by stitching three related Shorts.

## App implications

- **Curated hero set of 20–30 objects**, each with a blurb. An optional background cloud of ~500 plot-safe discoveries, stratified by class, shows scale.
- **Label honestly:** "Discovered by Rubin" only for objects with the X05 discovery flag; "Seen by Rubin" otherwise. Mark cc ≥6 orbits as estimated, or leave them out.
- **Hyperbolic objects** need time of perihelion rather than mean anomaly; the propagator must handle e > 1.
- **Pipeline (weekly is enough while data is paused):** column-projected DuckDB read of the B612 export (~8 s, ~100 MB) → JPL SBDB elements → JPL close-approach and Sentry calls → Fink for photometry. About 2–3 minutes, ~500 MB, no auth. Output: `public/data/rubin_recent.json`. A draft schema is in [rubin_recent.sample.json](rubin-data-spike-2026-09-28/rubin_recent.sample.json).
- **Browser calls are not viable:** JPL and ALeRCE send no CORS headers, MPC needs GET-with-body, and Lasair needs a token. Fink allows CORS but has no orbits.
