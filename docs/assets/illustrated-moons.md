# Illustrated moon surfaces: Proteus, Nereid, Styx, Kerberos, and Jupiter's captured moons

Proteus, Nereid, Styx and Kerberos were generated on 2026-09-28; Himalia, Valetudo, Carme and Pasiphae on 2026-10-09. Every planet and moon in the app has a surface, observed or imagined; a test enforces it, so a new body needs one of the two. **These are artist's illustrations, not maps.** No usable, clearly licensed surface map exists for these moons. Proteus has only low-resolution Voyager 2 images. Nereid, Styx and Kerberos were never resolved in any detail. An imagined surface was judged better than a flat sphere, as long as the app says so.

The app flags each asset with `illustration: true`. The moon panel carries a small “Imagined surface” footnote that opens to “Artist's illustration … this surface is imagined,” and the voice guide is told never to describe the features as real.

## How they are made

[`scripts/assets/build_illustrated_moons.py`](../../scripts/assets/build_illustrated_moons.py) renders each map from a fixed seed. Parameters and output hashes are in [illustrated-moons.manifest.json](illustrated-moons.manifest.json).

- Seeded 3D value noise and randomly placed craters (bowl plus raised rim) are evaluated on the unit sphere and then written to equirectangular pixels. Because nothing is drawn in 2D map space, the maps have no date-line seam or pole pinching.
- Relief shading from a fixed light direction gives the craters depth under the app's own lighting.
- Only the mean brightness is based on measurements, as a rough match to each moon's albedo: Proteus is dark (about 0.1), Nereid medium, and Styx and Kerberos bright. Proteus gets one very large crater as a nod to Pharos. Its position is not Pharos's real location. Jupiter's captured moons are very dark in reality and are drawn brighter so they can be seen; Himalia and Pasiphae are grey and Carme light red, following their telescope colours. Valetudo's colour has never been measured.
- Outputs: 2048 × 1024 detail tier and 1024 × 512 overview (Lanczos), JPEG quality 90, 4:4:4.

```sh
python3 scripts/assets/build_illustrated_moons.py --check   # verify committed hashes
python3 scripts/assets/build_illustrated_moons.py           # regenerate (numpy + Pillow)
```

Byte-identical regeneration assumes the recorded numpy/Pillow versions. These are original works generated for this app, so no third-party rights apply.

If a real map becomes available, for example from a future Proteus reprocessing, replace the illustration and drop the flag.
