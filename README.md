# Glyph

Glyph is a browser-native icon studio for turning one logo or mark into a production-ready, platform-aware icon system.

It is deliberately more than a favicon resizer: Glyph separates the source assets each platform expects from the masks those platforms apply at presentation time, then lets you inspect the result at actual display sizes before exporting.

## What is implemented

- Drag & drop PNG, JPEG, WebP, or SVG input
- Live optical controls: padding, scale, X/Y position, background, transparency, favicon shape, and Safari pinned-tab color
- Real-world previews for browser tabs, Google Search, iOS home screens, and PWA launcher masks
- Actual-size diagnostics at 16, 28, 48, and 180 CSS pixels
- Heuristic scores for contrast, visual density, optical balance, edge safety, and PWA maskable safe-circle survival
- Google Search 48×48 source export, distinct from its smaller circular presentation preview
- Apple Touch Icon export as a square opaque 180×180 source; iOS rounding is preview-only
- Separate PWA `any` and `maskable` assets; launcher rounding is never baked into either source
- PWA maskable 80% safe-circle overlay and diagnostic
- SVG sanitization/minification for vector-capable source artwork
- Monochrome `safari-pinned-tab.svg` generation from SVG input, including removal of a likely full-canvas background
- Client-side generation of 16/32/48 favicon PNGs and a multi-image `favicon.ico`
- ZIP export with optimized `icon.svg`, pinned-tab mask when available, `site.webmanifest`, `<head>` snippet, diagnostic JSON, and integration notes
- No upload backend: source artwork and diagnostics stay in the browser

## Platform rules encoded by Glyph

### Google Search

Glyph exports a square `favicon-48x48.png`. The search preview applies the presentation crop separately rather than burning a circle into the file.

### Apple Touch Icon

`apple-touch-icon.png` is always generated as a square, opaque 180×180 image. The rounded home-screen mask belongs to iOS and is simulated only in the preview.

### PWA

`android-chrome-192x192.png` and `android-chrome-512x512.png` are square `purpose: any` sources. `maskable-icon-512x512.png` is a distinct square, opaque asset and is tested against the guaranteed central safe circle.

### Safari pinned tabs

When the input is SVG, Glyph emits a sanitized/minified `icon.svg` and a separate monochrome `safari-pinned-tab.svg`. Raster inputs still receive the complete PNG/ICO set, but true vector pinned-tab output requires SVG geometry.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Stack

- Next.js App Router
- React + TypeScript
- Canvas API for raster generation and pixel diagnostics
- DOMParser/XMLSerializer for local SVG processing
- fflate for in-browser ZIP creation

## Philosophy

One mark, every surface. Export the correct source geometry for each platform, preview the mask separately, and judge the mark at the pixel sizes people actually see.
