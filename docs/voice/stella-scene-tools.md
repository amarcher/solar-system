# Stella scene controls

The app implements three explicit, idempotent client tools: `set_earth_tides(enabled)`, `set_constellation_lines(enabled)`, and `set_display_quality(preference)` (`auto`, `smooth`, `detailed`). Tides enabling focuses Earth in Explore/Orrery; Sky and mission replay return an explanation without changing the view. The layer remains the single combined Sun-and-Moon effect. Constellation lines require Orrery/Sky. Display quality cannot reconstruct missing terrain or guarantee frame rate.

Scene context follows manual and voice changes, including partial Voyager coverage, enhanced sky brightness, focused illustrative spacing, current toggles, and compact-screen limitations. Session startup includes the current mode, date/rate, and Sky observer location; snapshots refresh every ten seconds while connected in a realistic mode, and immediately for mode/rate/location changes. Context is descriptive, not pixel inspection. The tide model does not depict friction, lunar recession, or coastal predictions.

Existing time tools now reject Explore and invalid/non-finite rates. Sun peeling reports unavailable in compact/cinema views and Sky. Orrery mission requests invoke the actual replay path; unsupported names are rejected, and voice wording no longer calls the procedural path live telemetry.

## Scoped deployment

The September 21 live read showed four navigation tools attached, versus nine in the old repository file. The tracked agent file contains only public prompt text and tool IDs. Full voice, model, first message, platform settings, and workflow remain in an ignored private baseline. The candidate builder changes only prompt text and attachments on that baseline. Five existing IDs were read back individually; all four live navigation IDs remain. The three new tools were created unattached after the accepted dry run, and their canonical server IDs were read back. Timestamp-shaped CLI placeholder IDs were discarded.

The accepted dry run proposed one agent update and five tool operations: create the three scene tools; update the existing `track_mission` description and `set_time_speed` parameter description. The five tool operations have been applied. The dependency endpoint returned no agents or branches for either edited existing tool (`hasMore=false`). Stella itself has not yet been updated. The local ignored registry is limited to these operations; it must not push unrelated account tools.

Apply only after the app release serves the new handlers:

1. Re-read the live agent and the two edited tool dependencies. Preserve any intervening unrelated edits. Rebase only the reviewed prompt and intended attachments onto that fresh agent configuration.
2. Reverify the five applied tool definitions and canonical IDs. The CLI may return placeholder IDs for new tools; never trust a timestamp-shaped ID or invent one.
3. Run `node scripts/voice/prepare-stella-update.mjs FRESH_BASELINE.local CANDIDATE.local`. Point the one-agent ignored registry at that private candidate (never push the minimal tracked file directly). Run the agent dry run again, then apply only Stella. The builder attaches all twelve intended tools while preserving any unrelated intervening attachments.
4. Read back the canonical tool definitions and agent. Verify names/schema/IDs, compare every non-prompt/non-attachment field against the fresh baseline, and update the committed agent IDs.

Unit tests cover invocation-time state, idempotency, unsupported modes, strict input validation, missing texture honesty, and finite clock rates. Build/lint and browser/live voice verification remain separate checks; no live conversation was exercised during implementation.
