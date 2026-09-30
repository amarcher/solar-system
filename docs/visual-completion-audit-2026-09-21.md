# Visual teaching release completion audit

Audit date: 2026-09-21. Original goal: accomplish the visual-teaching-roadmap-2026-09-21.md plan. Status: complete. Implementation and publishing were verified, and the user subsequently confirmed testing on iOS: “Ive been testing on ios and it looks great!” This closes the remaining user acceptance gate.

## Scope and superseding user decisions

The first-release scope is milestones 0–4. Ranked later opportunities remain later opportunities, not implicit additional implementation commitments. Subsequent user directions supersede the initial lesson controls and recording UI: one combined Sun/Moon rippling spheroid toggle in the existing scene; no arrows, separate lesson view, manual ripple pause, source selection, or on-canvas water disclaimer. Compact, consistent moon treatment applies to Orrery. Focused views spread surrounding planet centers and orbit paths without resizing bodies. Reel direction and publication followed explicit later approval.

## Evidence checked now

- GitHub main is 9b88d61d2e78e0c92e8b91834306844ca0f47ea5 (PR82). The ordinary local main checkout remains at the older 1d170d0; do not mistake that checkout for the deployed revision. Implementation inspection used the existing reviewed worktrees.
- GitHub currently reports PR69–72 and PR74–82 merged; PR73 is closed and superseded. The inspected milestone/follow-up PR heads have successful Vercel checks. Their descriptions record independent adversarial review, applicable tests, browser checks, and resolved findings. PR82 reports 201 passing tests and Earth-axis reference comparisons.
- Foundation: docs/performance/visual-baseline.md records matched desktop production samples, bounded texture loading and quality tiers. Warm desktop p95 is about 9.3 ms. This does not establish phone performance or eliminate all cold-load hitches.
- Moon assets: PR70 and docs/assets/uranian-moons.md document inspected maps for all five major Uranian moons, source hashes, partial photographed coverage, selected-detail loading, and compact layout inspection. The legacy provenance audit explicitly leaves unresolved sources unverified; it does not invent credits or coverage.
- Celestial sky: PR71 and docs/assets/celestial-layer-integration.md record coordinate fixtures, magnitude-aware stars, independent constellation toggle, horizon/daylight and camera-translation checks. The current production screenshot again showed the Milky Way behind Earth.
- Tides/scales: PR74, 77–79 document the final in-canvas toggle, all-system moon policy and focused heliocentric spacing. Current production reload selected 1 day/s; enabling the Earth tides checkbox focused Earth and displayed the water shell and Moon. The date advanced and no retired controls or disclaimer appeared.
- Earth rotation: PR82 corrected the Earth equatorial-to-ecliptic axis frame, not the eastward rotation sign. Reviewed regression evidence includes independent astronomy observer vectors and actual Three.js UV/quaternion composition.
- Stella: a fresh read of the live agent through the installed ElevenLabs SDK found exactly 12 tool attachments, all reviewed IDs present and exact reviewed prompt text. Conversation settings, platform settings, workflow and version matched the saved post-application response. The existing saved text simulation reports successful tides and 1 day/s tool use. This verifies that the earlier docs/voice/stella-scene-tools.md statement that application was pending is historical and stale. No new remote mutation was needed during this audit. A real microphone interaction remains unverified.
- Capture/publication: V10 is the user-approved 1080x1920, 60fps reel, with a freshly recorded production ending after PR82. The approved caption and first comment were published and verified in the prior turn. The persisted publication receipt was read again during this audit: /Users/archer/Programs/earth-moon-tides/v10/PUBLICATION-RECEIPT.md. Public posts: https://www.instagram.com/reel/DdkOw3bDBPy/ and https://www.facebook.com/reel/1566663324662186/. Do not repost. Pinning was not verified or claimed.

## Remaining acceptance evidence

The user selected a physical iPhone in Safari. Desktop viewport emulation and the successful desktop capture do not prove this acceptance gate. The current evidence still lacks device model/iOS version, physical touch verification, a phone benchmark, and an actual voice/microphone check. An asynchronous question requesting existing on-device results is pending.

On-device check:

1. Open https://spaceexplorer.tech/ in Safari. Record iPhone model and iOS version. Confirm Orrery starts at 1 day/s; pan and pinch while time runs.
2. Open Earth tides from the menu, leave it on while panning, and toggle off. Confirm touch targets work, the Moon stays distinct and the app remains responsive.
3. Visit Uranus and Miranda. Inspect the photographed terrain; the incomplete northern coverage is expected. Check another moon system for usable size/spacing.
4. Switch Explore, Orrery and Sky; check the Milky Way/constellation controls and that menu/mode controls continue to respond. An earlier Pluto-to-Sky control issue was documented as pre-existing; any current reproduction should be reported, not silently counted as a pass.
5. Ask Stella to turn on Earth tides and set one day per second from Orrery. Confirm audio and the actual on-screen changes, then end the session.
6. For measured performance, open https://spaceexplorer.tech/?benchmark=orbit and keep Safari visible without interaction for at least 25 seconds. Report the displayed p95 and slow-frame counts. The proposed phone target is warm p95 <=33 ms; it is not yet a measured result.

The prior goal turn was progress: it published and verified both approved social posts and comments. This audit turn is also progress: it revalidated merged delivery/live Stella and identified the remaining evidence accurately. No completion or blocked status is justified yet. No dependency installation, new deployment or additional social post is needed to resolve the current device gate.

## Final user acceptance

The user confirmed testing on iOS and reported that it looks great. Together with the delivery and live-state evidence above, this closes the goal. The earlier pending-device section is retained as historical audit context, not outstanding work. This is qualitative user acceptance; no specific device model, numeric phone benchmark, or separate microphone-test result was supplied, and none is claimed. No known implementation work or publishing action remains.
