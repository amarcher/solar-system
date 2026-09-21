# NASA celestial Milky Way background

These two textures derive exclusively from the **Milky Way background in celestial coordinates** in [NASA SVS Deep Star Maps 2020, item 4851](https://svs.gsfc.nasa.gov/4851/). This source omits the bright Hipparcos and Tycho stars. It is suitable behind the app's separately rendered bright-star catalogue; it is not the full star map or the galactic-coordinate variant offered on the same page.

| Delivered file | Dimensions | Transfer size | RGBA base memory | With mipmaps, approximately |
|---|---:|---:|---:|---:|
| `public/textures/skybox/galaxy_milky_way_2k.jpg` | 2048 × 1024 | 729,202 bytes | 8 MiB | 10.7 MiB |
| `public/textures/skybox/galaxy_milky_way_4k.jpg` | 4096 × 2048 | 3,541,208 bytes | 32 MiB | 42.7 MiB |

Use 2K as the conservative initial asset. The 4K version is an optional quality upgrade; loading both simultaneously costs the sum of their decoded memory. Renderer-generated cubemaps, image decode memory and other textures are additional. These are ordinary sRGB JPEGs, not GPU-compressed textures or HDR gain-map JPEGs.

## Source and attribution

- [Pinned source EXR](https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_4k.exr): 4096 × 2048, 36,436,668 bytes, half-float linear RGB.
- SHA-256: `2eb802d6e68d170b410f766c7fec07f7518619f6b6708fdc81e9302d93e74fdb`.
- Applicable credit, preserving the asset page's wording: **NASA/Goddard Space Flight Center Scientific Visualization Studio. Gaia DR2: ESA/Gaia/DPAC.**
- Visualization by Ernie Wright (USRA).
- [NASA SVS reuse policy](https://svs.gsfc.nasa.gov/help/): SVS content is public domain unless otherwise noted. No separate restriction is listed for this background. NASA also links its [media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). This is not a claim that all ESA imagery is public domain.
- The page also credits constellation figures to their creators. Those separate figure images are **not included** in these derivatives.
- Source description, projection and reuse pages checked 2026-09-21. Full source/output hashes, processing and tool versions are in [nasa-celestial-sky.json](nasa-celestial-sky.json).

Keep the NASA/Gaia credit visible in the app's asset credits and in any exported material using this background. Do not imply NASA or ESA endorsement.

## Exact projection contract

The source uses **ICRF/J2000 geocentric right ascension and declination**, in a plate carrée (equirectangular) projection. NASA specifies RA 0h at the center and RA increasing to the left. North is the top edge. Neither derivative is rotated, cropped, horizontally reversed, vertically reversed, or reprojected.

For normalized raster coordinates with `y` measured down from the top:

```text
u = fract(0.5 - raDegrees / 360)
y = 0.5 - decDegrees / 180
```

| Equatorial direction | Raster position |
|---|---|
| RA 0h, Dec 0° | center: `(0.5, 0.5)` |
| RA 6h, Dec 0° | left quarter: `(0.25, 0.5)` |
| RA 12h, Dec 0° | left/right seam: `(0 or 1, 0.5)` |
| RA 18h, Dec 0° | right quarter: `(0.75, 0.5)` |
| North celestial pole | top edge |
| South celestial pole | bottom edge |

For the app's equatorial direction convention:

```text
direction = (cos(dec)*cos(ra), sin(dec), -cos(dec)*sin(ra))
textureU = fract(0.5 + atan2(direction.z, direction.x) / (2*pi))
textureV = 0.5 + asin(clamp(direction.y, -1, 1)) / pi
```

The second formula uses **bottom-up texture UVs** with `TextureLoader`'s normal `flipY = true`. Set `SRGBColorSpace`. It matches Three.js's `equirectUv` direction sampler in the installed Three.js source. Ordinary `SphereGeometry` uses the opposite horizontal UV convention; rendering its back faces alone does not correct that. Use direction-based sampling, or explicitly correct the sphere UVs and test the table above. Avoid adding an arbitrary 180° turn to make the scene look plausible.

Apply the same equatorial-to-ecliptic conversion as the stars in Orrery, or the same equatorial-to-observer transformation in Sky. The asset itself does not contain either transformation. Keep the backdrop camera-centered so camera translation does not create nearby-looking stellar parallax.

The [contact sheet](nasa-celestial-sky-contact.jpg) preserves source orientation and marks coarse visual landmarks: the galactic-center region near RA 266.4°, Dec −29°; Large Magellanic Cloud near RA 80.9°, Dec −69.8°; and Small Magellanic Cloud near RA 13.2°, Dec −72.8°. All three agree visually with the expected location and handedness. These rounded landmarks are an orientation check, not a replacement for the renderer's authoritative catalogue tests. The final renderer must also test bright-star alignment, hemisphere/horizon behavior and the seam.

## Reproducible conversion

The recipe uses existing FFmpeg, NumPy and Pillow. It does not install packages or run during the app build. From the repository root, with those tools available:

```sh
python3 scripts/assets/prepare_nasa_celestial.py --download
```

The source caches under ignored `dist/asset-source-nasa/`. Alternatively provide a previously downloaded source:

```sh
python3 scripts/assets/prepare_nasa_celestial.py --source /path/to/milkyway_2020_4k.exr
```

The recipe refuses any source whose SHA-256 differs. It decodes native half-float planar GBR and reorders the channels to RGB. At 2K it averages each 2 × 2 source block in **linear light**; 4K retains native dimensions. It then applies these fixed, global display operations:

1. Increase exposure by one stop: `exposed = 2 * source`.
2. Compress each channel with a Reinhard curve: `displayLinear = exposed / (1 + exposed)`.
3. Encode with the standard piecewise sRGB transfer function.
4. Round to 8-bit and encode JPEG quality 92, 4:4:4 chroma, optimized entropy coding.

There is no local contrast mask, star injection, generative fill, denoising, color painting, sharpening or spatial warp. The display curve changes brightness and can slightly compress color differences; this is a **display-enhanced catalogue visualization**, not a calibrated naked-eye sky or a promise that these details are visible from every observing site. The source still contains vast numbers of faint stars and some resolved clusters. Omitting the bright-star foreground does not mean it is star-free.

The production texture is already display processed. Further exposure/tone mapping in the renderer must be a deliberate visual choice; avoid accidental double gamma encoding. Daylight and an optional reduced-brightness sky treatment should be applied consistently with the foreground stars.

Both derivative hashes and the contact sheet reproduced identically on two consecutive runs using the tool versions recorded in the JSON. JPEG encoders or fonts in different library versions may change file bytes even with the same recipe; compare decoded image content as well as hashes when intentionally upgrading the conversion toolchain. The source EXR is not committed or shipped.
