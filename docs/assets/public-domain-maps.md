# Legacy texture provenance: resolved

Resolved on 2026-09-28. This supersedes the open questions in [legacy-moon-provenance.md](legacy-moon-provenance.md). Every body texture now has a verified, liberally licensed source. Maps under "personal non-commercial use only" terms were replaced rather than kept under an informal permission, because the page loads AdSense.

## How origins were identified

For each bundled file, candidate originals were downloaded and compared: sha256 first, then the mean absolute difference (MAD) per channel at 256×128 Lanczos, testing longitude rolls, left-right mirroring and vertical flips. A MAD under about 1 on the 0–255 scale is a downscale of the same image.

## Where the old files came from

| Body | Old file's actual origin | Match | Terms | Result |
| --- | --- | --- | --- | --- |
| Mercury, Venus (surface), Mars, Jupiter, Saturn, Neptune, Sun, Earth, Moon | Solar System Scope `2k_*.jpg` | byte-identical | CC BY 4.0 | **Kept**, credited per file |
| Io | Steve Albers `io_rgb_cyl.jpg` | MAD 0.3 | “personal non-commercial use only” | Replaced |
| Europa | Albers `europa_rgb_cyl_juno.png` | MAD 0.3 | non-commercial | Replaced |
| Ganymede | Albers `ganymede_4k.jpg` (modified Björn Jónsson map) | MAD 0.2 | non-commercial | Replaced |
| Callisto | Björn Jónsson `callisto.jpg`, upscaled | MAD 0.4 | free with credit, but “please do not place a copy of the maps on your website” | Replaced |
| Titan, Enceladus, Mimas, Rhea, Dione, Tethys, Iapetus | Albers `*_rgb_cyl_www.jpg` | MAD 0.1–0.5 | non-commercial | Replaced |
| Hyperion | CelestiaContent `textures/medres/hyperion.jpg` by ItzImcool | byte-identical | CC BY 4.0 (SPDX sidecar) | **Kept**, credited |
| Triton, Charon | Albers `triton_rgb_cyl_www.jpg`, `charon_rgb_cyl.jpg` | MAD 0.2, 0.1 | non-commercial | Replaced |
| Phobos | Stooke PDS `phrelcyl.jpg`, **flipped south-up** | MAD 0.5 | public domain | Replaced with a north-up photomosaic |
| Deimos | Stooke PDS `newmap.jpg`, **flipped south-up** | MAD 0.5 | public domain | Replaced with the improved north-up mosaic |
| Uranus | Planet Pixel Emporium `uranusmap.jpg` | byte-identical | © James Hastings-Trew; no redistributing “as is” on another website | Replaced |
| Pluto | Planet Pixel Emporium `plutomap2k.jpg` | byte-identical | same, and the creator says it “actually isn't pluto at all” (a modified Ganymede map) | Replaced |
| Ceres | Solar System Scope `2k_ceres_fictional.jpg` | byte-identical | CC BY 4.0, but labeled “Fictional” | Replaced with real Dawn data |

Albers's terms are quoted from the footer of https://stevealbers.net/albers/sos/sos.html: “The images on this page are intended for personal non-commercial use only.” Jónsson's are from https://bjj.mmedia.is/data/planetary_maps.html. Planet Pixel Emporium's are from a 2026-06-01 Wayback snapshot of planetpixelemporium.com/planets.html; the live site does not resolve.

## Replacement sources

The source catalog with download URLs and SHA-256 locks is [public-domain-maps.sources.json](../../scripts/assets/public-domain-maps.sources.json). Output hashes and the steps actually applied are in [public-domain-maps.manifest.json](public-domain-maps.manifest.json).

| Body | Source | Credit | Terms |
| --- | --- | --- | --- |
| Phobos | Stooke Small Bodies Maps V2.0, `phobos_cyl_cor_control.jpg` (Viking, MGS, Mars Express, MRO; Cornell control) | Stooke, P., Stooke Small Bodies Maps V2.0, MULTI-SA-MULTI-6-STOOKEMAPS-V2.0, NASA Planetary Data System, 2012 | “in the public domain but should not be used without proper credit” |
| Deimos | Same set, `deimos_cyl_viking_mro.jpg` | same | same |
| Io | USGS Io Galileo SSI / Voyager Color Merged Global Mosaic 1km | NASA/JPL/USGS Astrogeology Science Center | USGS public domain |
| Europa | USGS Europa Voyager–Galileo SSI Global Mosaic 500m | same | USGS public domain |
| Ganymede | USGS Ganymede Voyager–Galileo SSI Color Global Mosaic 1.4km | same | USGS public domain |
| Callisto | USGS Callisto Voyager–Galileo SSI Global Mosaic 1km | same | USGS public domain |
| Titan | [PIA22770](https://photojournal.jpl.nasa.gov/catalog/PIA22770) “Titan Mosaic: The Surface Under the Haze” | NASA/JPL-Caltech/Univ. Arizona | [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) |
| Enceladus, Mimas, Rhea, Dione, Tethys, Iapetus | PIA18435, PIA18437, PIA18438, PIA18434, PIA18439, PIA18436, “Color Maps of … 2014” (Paul Schenk) | NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute | NASA media guidelines |
| Triton | [PIA18668](https://science.nasa.gov/photojournal/map-of-triton) (also USGS Triton Voyager 2 Global Color Mosaic 600m) | NASA/JPL-Caltech/Lunar & Planetary Institute (Paul Schenk) | NASA media guidelines |
| Charon | USGS Charon New Horizons LORRI MVIC Global Mosaic 300m | NASA/JHUAPL/SwRI/Lunar and Planetary Institute (New Horizons Team) | NASA media guidelines; USGS “please cite authors” |
| Pluto | [PIA11707](https://photojournal.jpl.nasa.gov/catalog/PIA11707) Pluto Color Map | NASA/Johns Hopkins University Applied Physics Laboratory/Southwest Research Institute | NASA media guidelines |
| Ceres | USGS Ceres Dawn FC Global Mosaic 400m | NASA/JPL-Caltech/UCLA/MPS/DLR/IDA | USGS “please cite authors” |
| Uranus | Solar System Scope `2k_uranus.jpg`, copied unmodified | Solar System Scope | CC BY 4.0 |

NASA's guidelines say texture maps “generally are not subject to copyright in the United States”. They ask that NASA be acknowledged, that nothing imply NASA endorsement, and they note that third-party material is marked as copyrighted. None of these PIA pages carries such a marking. The Ceres and Charon credits include non-NASA partners (MPS/DLR/IDA, LPI). Their products carry no copyright marking, and USGS asks only that the authors be cited. No primary page explicitly puts those partners' contributions in the public domain, so keep the full credit line.

## Processing

`python3 scripts/assets/build_public_domain_maps.py [--download] [--only id …] [--check]`

Each source is hash-verified and decoded to RGB. The script applies only the steps listed for that entry, then writes 2048 × 1024 and 1024 × 512 JPEGs (Lanczos, quality 90, 4:4:4). Uranus is copied byte-for-byte and has only the 2K file.

- **Longitude roll.** Io's USGS source is centered on 180°, so it is rolled half a width to match the app's 0°-at-left layout. The other sources already matched the old files' layout at zero roll.
- **No-data fill.** Europa, Ganymede, Callisto, Triton, Charon and Pluto have black unimaged regions. The fill finds dark regions (every channel ≤ 8, or ≤ 24 for Pluto's JPEG) that reach the top or bottom 5% of rows and cover at least 0.05% of the image. It replaces them with neutral gray at the map's median brightness. Small dark craters are left alone. Filled fractions: Europa 4.3%, Ganymede 3.6%, Callisto 3.8%, Triton 38.6%, Charon 34.1%, Pluto 30.3%. The app's panel and voice context say these areas have no imagery.
- **Saturation.** The 2014 Schenk maps use color “enhanced, or broader, relative to human vision, extending into the ultraviolet and infrared”. That makes Rhea, Dione and Tethys look olive-green, so saturation is reduced to 30%. Triton's Voyager false color is reduced to 50%.
- **Uniform tint.** Grayscale mosaics are multiplied by one constant RGB factor, with no spatial color information. Europa: cream (1, 0.96, 0.88). Callisto: warm gray (1, 0.94, 0.86). Titan: warm (1, 0.92, 0.78), to suggest its orange appearance. Titan's map is a 938 nm infrared view of the surface beneath the haze.

## Known limitations

- Europa, Callisto, Charon, Phobos, Deimos and Ceres are grayscale sources with at most a uniform tint.
- Mosaic seams and resolution patchwork remain visible in the USGS Jupiter-moon mosaics.
- Hyperion's CC BY 4.0 map was made for Celestia's irregular shape model, so its features distort on the app's sphere.
- Longitudes follow each source's published layout. They were checked against the old files by correlation, not by georeferencing individual features.
- Solar System Scope says its textures are slightly over-saturated and that unmapped gaps are filled with “fictional terrain that corresponds with the rest of the landscape”.
