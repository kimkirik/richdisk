Map attribution and maintenance

- `liberty.json`: OpenFreeMap Liberty style, downloaded from https://tiles.openfreemap.org/styles/liberty on 2026-09-12. Style source: https://github.com/hyperknot/openfreemap-styles (OpenMapTiles design, CC BY 4.0). Its geometry, fonts, and sprites are served by OpenFreeMap using OpenStreetMap data. Attribution remains visible on the map.
- Korean labels prefer OpenStreetMap `name:ko` / `name_ko`; country ISO aliases use Unicode CLDR names. Unknown local names retain the source name, without inferred transliteration or location changes.
- `vendor/` is copied from the exact versions locked in package-lock.json by scripts/prepare-map-client.mjs. Original licenses are included. No external JavaScript CDN or paid API key is needed.
- `korean-basemap-*.mjs` is generated from lib/korean-basemap.js with a content hash, like the existing sea-level client assets.
