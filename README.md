# Glyph

Glyph is a browser-native icon studio for turning one logo or mark into a production-ready icon set.

It is deliberately more than a favicon resizer: Glyph lets you inspect the same source under the masks and optical sizes people actually see — browser tabs, Google search, iOS home screens, and PWA maskable icons — before exporting.

## What is implemented

- Drag & drop PNG, JPEG, WebP, or SVG input
- Live optical controls: padding, scale, X/Y position, background, transparency, and output shape
- Safe-area overlay for PWA maskable icons
- Real-world previews for browser tabs, Google search, iOS, and PWA contexts
- Client-side generation of 16/32 favicon PNGs, Apple Touch Icon, 192/512 PWA icons, maskable icon, and multi-image `favicon.ico`
- ZIP export with `site.webmanifest`, `<head>` snippet, and integration notes
- No upload backend: source artwork stays in the browser

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
- Canvas API for raster generation
- fflate for in-browser ZIP creation

## Philosophy

One mark, every surface. Design at actual display conditions instead of trusting a 512 px master and hoping every platform crops it well.
