"use client";

import { useGlyphStudio } from "@/lib/use-glyph-studio";
import { GlyphMark } from "./glyph-icons";
import { StudioPanels } from "./glyph-controls";
import { GlyphPreviews } from "./glyph-previews";
import { GlyphDiagnostics } from "./glyph-diagnostics";

export function GlyphStudioV2() {
  const studio = useGlyphStudio();
  return <>
    <main className="shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Glyph home"><GlyphMark /><span>Glyph</span></a>
      <nav className="nav" aria-label="Primary navigation"><a href="#studio">Studio</a><a href="#diagnostics">Diagnostics</a><a href="https://github.com/akiralazycat/glyph" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a></nav>
    </header>

    <section className="hero" id="top">
      <div className="eyebrow"><span /> Icon systems, not icon files</div>
      <h1>One mark.<br />Every surface.</h1>
      <p>Design one source against the rules that actually differ: browser favicons, Google Search, Apple Touch Icon, PWA masks, and Safari monochrome pins.</p>
      <div className="privacy-note"><span className="privacy-dot" /> Local by design. Artwork and diagnostics stay in this browser.</div>
    </section>

    <StudioPanels studio={studio} />
    <GlyphPreviews studio={studio} />
    <GlyphDiagnostics studio={studio} />

    <section className="principles">
      <article><span className="principle-index">A</span><h3>Design at 16 px.</h3><p>The diagnostic weights the tab heavily because that is where excessive detail fails first.</p></article>
      <article><span className="principle-index">B</span><h3>Export source, preview mask.</h3><p>Glyph separates source-file geometry from platform presentation so rounded corners are not accidentally applied twice.</p></article>
      <article><span className="principle-index">C</span><h3>Keep vectors vector.</h3><p>SVG input now produces an optimized scalable icon and a dedicated monochrome pinned-tab mask alongside raster fallbacks.</p></article>
    </section>

    <footer><a className="brand brand--footer" href="#top"><GlyphMark compact /><span>Glyph</span></a><p>One mark, every surface.</p><span>Open source · MIT</span></footer>
    </main>
  </>;
}
