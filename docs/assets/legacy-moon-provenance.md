# Existing moon texture provenance audit

Read-only asset audit, 2026-09-21. Scope: the 17 moon textures already present before the five Uranian imports in `039c218839ae8b289843056c870d44f1b85fe0db`. No legacy texture or application behavior was changed by this audit.

**Result: Earth's Moon has a verified byte-identical publisher source. Callisto has a strong image-level match to a named contributor's source, with the exact transformation chain unresolved. The remaining 15 files have historical source leads but no verified file-level provenance. The original blanket Solar System Scope credit is not supported for these 16 outer/small-moon maps.**

## Repository evidence

- `f1bcaf94fb76424cb2c400b8bffbdad6cc80a995` introduced Earth's Moon and nine other moon maps on 2026-03-17. Its commit message attributes the nine to NASA data via Steve Albers: Io, Europa, Ganymede, Callisto, Titan, Enceladus, Mimas, Triton, Charon. It distinguishes the planet maps as Solar System Scope / CC BY 4.0.
- `82ba47156478477e56bf3281aa18f3cd6ccc3b94` introduced Phobos, Deimos, Rhea, Dione, Tethys, Iapetus, and Hyperion on 2026-04-03. It lists Steve Albers, USGS, and Celestia collectively, without mapping individual files to authors, URLs, versions, or licenses.
- None of these 17 files has a later content-changing commit in this worktree's ancestry. Their JPEG EXIF does not provide author, copyright, or description fields that resolve the missing provenance.
- `976ac8b67dffa1a547511fddd4feff95951f29d1` removed the previously imported five Uranian moon maps because the unmapped northern halves were black. The new Uranian assets address that original issue with a documented plain-gray no-imagery treatment.

These are repository-history claims, not proof that every historical attribution was correct. The distinction matters for source rights.

## Per-body result

All existing files are 2048 × 1024 JPEGs under `public/textures/2k/{id}_diffuse.jpg`. “History only” means the exact file and its reuse terms remain unverified.

| Body ID | Import | Provenance result | Next evidence needed |
| --- | --- | --- | --- |
| `moon` | `f1bcaf9` | **Verified:** byte-identical to [Solar System Scope's 2K Moon JPEG](https://www.solarsystemscope.com/textures/download/2k_moon.jpg). | Keep publisher attribution and CC BY 4.0 link; no image transformation claimed. |
| `io` | `f1bcaf9` | History only: Albers. [Current direct candidate](https://stevealbers.net/albers/sos/jupiter/io/io_rgb_cyl.jpg). | File/version match and applicable permission, or clean replacement. |
| `europa` | `f1bcaf9` | History only: Albers. [Current direct candidate](https://stevealbers.net/albers/sos/jupiter/europa/europa_rgb_cyl_juno.png). | File/version match and applicable permission, or clean replacement. |
| `ganymede` | `f1bcaf9` | History only: Albers. [Current direct candidate](https://stevealbers.net/albers/sos/jupiter/ganymede/ganymede_4k.jpg). | File/version match and applicable permission, or clean replacement. |
| `callisto` | `f1bcaf9` | **Strong derivative match, unresolved transformation:** [Björn Jónsson's original map](https://bjj.mmedia.is/data/callisto/callisto.jpg), linked by Albers. See comparison below. | Prefer a clean, hash-locked reimport directly from the named creator with the creator's credit and terms. |
| `titan` | `f1bcaf9` | History only: Albers. Exact original map not identified. | Locate the specific source; distinguish surface/infrared imagery from the visible haze before reusing it. |
| `enceladus` | `f1bcaf9` | History only: Albers. [Current direct candidate](https://stevealbers.net/albers/sos/saturn/enceladus/enceladus_rgb_cyl_www.jpg). | File/version match and applicable permission, or clean replacement. |
| `mimas` | `f1bcaf9` | History only: Albers. [Current direct candidate](https://stevealbers.net/albers/sos/saturn/mimas/mimas_rgb_cyl_www.jpg). | File/version match and applicable permission, or clean replacement. |
| `triton` | `f1bcaf9` | History only: Albers. [Current direct candidate](https://stevealbers.net/albers/sos/neptune/triton/triton_rgb_cyl_www.jpg). | File/version match and applicable permission, or clean replacement. |
| `charon` | `f1bcaf9` | History only: Albers. [Current direct candidate](https://stevealbers.net/albers/sos/pluto/charon/charon_rgb_cyl.jpg). | File/version match and applicable permission, or clean replacement. |
| `phobos` | `82ba471` | History only: collective Albers/USGS/Celestia claim. | Per-file source and author; the commit does not resolve them. |
| `deimos` | `82ba471` | History only: collective Albers/USGS/Celestia claim. | Per-file source and author; the commit does not resolve them. |
| `rhea` | `82ba471` | History only: collective Albers/USGS/Celestia claim. [Albers candidate](https://stevealbers.net/albers/sos/saturn/rhea/rhea_rgb_cyl_www.jpg). | Per-file source, transformation and terms. |
| `dione` | `82ba471` | History only: collective Albers/USGS/Celestia claim. [Albers candidate](https://stevealbers.net/albers/sos/saturn/dione/dione_rgb_cyl_www.jpg). | Per-file source, transformation and terms. |
| `tethys` | `82ba471` | History only: collective Albers/USGS/Celestia claim. [Albers candidate](https://stevealbers.net/albers/sos/saturn/tethys/tethys_rgb_cyl_www.jpg). | Per-file source, transformation and terms. |
| `iapetus` | `82ba471` | History only: collective Albers/USGS/Celestia claim. [Albers candidate](https://stevealbers.net/albers/sos/saturn/iapetus/iapetus_rgb_cyl_www.jpg). | Per-file source, transformation and terms. |
| `hyperion` | `82ba471` | History only: collective Albers/USGS/Celestia claim. | Per-file source and author; the commit does not resolve them. |

## Primary-source checks and rights

### Earth's Moon: exact match

The [publisher's texture catalog](https://www.solarsystemscope.com/textures/) identifies its texture collection as CC BY 4.0. The downloaded 2K Moon file is 1,053,869 bytes and has exactly the same SHA-256 as the repository asset:

`2764ba6535ea0481a062846ee033cc7a909dae05b31a8fd13f3e98f3a7fd92bd`

This verifies the specific file, rather than inferring provenance from its name or appearance. Credit **Solar System Scope**, link [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), and identify any future modifications. The publisher describes the collection as display-oriented imagery with adjusted color and possible filled gaps; this match does not make the image a calibrated scientific product.

### Albers: permission must not be assumed from NASA ancestry

The [creator's planetary maps page](https://stevealbers.net/albers/sos/sos.html) states: **“intended for personal non-commercial use only.”** No additional permission record was found in the tracked repository files examined. Its source descriptions also identify other image processors and contributors. Consequently, do not replace these maps' unresolved status with “NASA public domain” or “CC BY 4.0,” and do not treat the current blanket README attribution as permission for commercial promotional exports. The existing file's specific authorship, applicable permission, or a clean replacement needs to be established.

The primary catalog was readable through the web research tool, including direct candidate links. Two targeted attempts to retrieve its Io/Ganymede candidate bytes returned HTTP 406; other links sometimes timed out in the research tool. No byte comparison was possible for those files in this audit. The failed requests are not evidence about which file was originally imported. No broad archive crawl or speculative asset collection was attempted.

### Callisto: contributor source closely matches, but is not byte-identical

Albers links [Björn Jónsson's Callisto map](https://bjj.mmedia.is/data/callisto/callisto.jpg). That specific source was fetched successfully: 1800 × 900, 440,420 bytes, SHA-256 `3d257051c1996df9e4a19c08df839c72fa242df46be1d3172e74dfb924de3e3b`.

A side-by-side visual inspection shows matching terrain, seams, colors, and orientation. Resizing both images to 256 × 128 with Pillow Lanczos gives mean absolute channel differences of R 0.3591, G 0.3053, B 0.4097 on a 0–255 scale. Resizing the source to the app's 2048 × 1024 gives mean differences of R 2.5548, G 2.5196, B 2.6364. This strongly supports shared image ancestry; it does **not** reconstruct the precise enlargement, JPEG encoding, possible intermediate alterations, or permission chain. The app file appears to contain no extra source resolution beyond this smaller candidate.

The creator's [map-use statement](https://bjj.mmedia.is/acknow.html) permits use of planetary maps without special permission, asks for creator attribution, and distinguishes those maps from separately restricted space-art renders. A future clean import directly from this source would have a much clearer record than retaining an undocumented intermediate image. Do not apply this creator's permission statement to unrelated Albers maps.

NASA's [media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) distinguish agency material from third-party protected works. The underlying spacecraft data and a contributor's processed map are separate provenance questions.

## Recommended manifest treatment

- Mark `moon` verified, with the publisher source URL, **Solar System Scope** credit, CC BY 4.0 license URL, and the byte-match evidence above.
- Keep the other 16 legacy maps pending. Record the specific history lead; for Callisto, additionally record the strong contributor-source match and unresolved processing chain.
- Resolve future commercial exports through explicit permission evidence or freshly imported, individually credited sources. Do not silently overwrite the existing files as part of this audit.
- Keep the five new Uranian maps separate: their new NASA source locks and transformations are documented in [uranian-moons.md](uranian-moons.md).

## Reproducing the audit

Start with `git log --follow -- public/textures/2k/<body>_diffuse.jpg` and the two import commits above. Hash local files with SHA-256. Compare actual publisher bytes when available; neither filename similarity nor a NASA-derived description is sufficient. Temporary comparison downloads are under the ignored `.legacy-audit.local/` directory and are not part of this commit.

The following hashes identify the exact existing files reviewed; they do not by themselves establish rights:

| Body | Bytes | SHA-256 |
| --- | ---: | --- |
| `moon` | 1,053,869 | `2764ba6535ea0481a062846ee033cc7a909dae05b31a8fd13f3e98f3a7fd92bd` |
| `phobos` | 376,585 | `a5912196662066fe1d9d5817f8a5b7c9c8f1818ab2528d5235ef80b4cf36e657` |
| `deimos` | 189,760 | `f8d3aabe391743f9a3a47b9af00712f7e3ac7a82941649595cc7c9453adb2280` |
| `io` | 464,797 | `5aaa7190bfba0a9af0becdfdb9d4a25d71b43fc60aa656b218c23d5d76d697a2` |
| `europa` | 530,525 | `c9f2b59947b684effd3b01b793e3f946a2f71af004fd261176a8e67c9e74c7e3` |
| `ganymede` | 598,837 | `d01ecbee421dd89d40a25cff2e9ff2fdfe7796c94b7b5d1365c4eea5cbc6301b` |
| `callisto` | 670,950 | `de8fc6bbf9352b3fda88165749dd8ef31b7fc73a37a03b3e6c4cc85e3be67b41` |
| `titan` | 376,182 | `eaf54bce86f840a3d1e4b85dfd0fc0322189bb9490ca41659aabbc06209d466a` |
| `enceladus` | 566,601 | `f0df5d1093ba1e86d7492d322eb1bff2b81e8c2b6356559c46ed725adb306027` |
| `mimas` | 531,465 | `bf4f5cc5b5bc43683daa416da293f2fd59ae159e4e7550eb085e66a46ff005da` |
| `rhea` | 751,507 | `4140cb1e2c158b9e486e30533b16915fc8359951786cf8c8b352999761ed78a7` |
| `dione` | 673,346 | `b149c4f998449a9768be5f3aa3e086e5476fc6287b9a8242d447add0500d1a3a` |
| `tethys` | 700,352 | `f620ccfdd22b26eea1483caedc844293ce10c5f5b9dfc4b1c932540b70e31588` |
| `iapetus` | 516,945 | `c12c6cd0cef36c1703dda16e86ca9274f3424071cd2462cadc023eedb6e88595` |
| `hyperion` | 296,038 | `b32fa8f4f98a1989f55ab3971d153adf2e3eb25d459969f550aefa310143c207` |
| `triton` | 289,204 | `24449dd0ae2a825b58c4780a09d677826e3bfd820328e554ad8e7cb69d67b371` |
| `charon` | 261,535 | `91229c5335954f847f5113e1d4efd422262a6442d0c0f7b76b12f7053a105611` |
