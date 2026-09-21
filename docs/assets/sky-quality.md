# Existing sky texture quality variants

Source: https://www.solarsystemscope.com/textures/download/8k_stars_milky_way.jpg

Credit: Solar System Scope. License: https://creativecommons.org/licenses/by/4.0/

On 2026-09-21, the publisher file and bundled 8192×4096 original had identical SHA-256: `1fd005ddd6d53364cc5106e0121b83fd3bca236b1503f6b51f5501d9d51eafaf`.

The 4096×2048 derivative was created with macOS sips:

```sh
sips -Z 4096 public/textures/skybox/stars_milky_way_8k.jpg --out public/textures/skybox/stars_milky_way_4k.jpg
```

No content was synthesized. The existing 2K map remains the default. This artistic panorama includes bright stars; it must not be indiscriminately overlaid with the catalog in realistic modes. The planned NASA Milky Way-only layer is a separate asset.
