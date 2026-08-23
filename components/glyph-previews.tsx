import type { Shape } from "@/lib/icon-engine";
import type { GlyphStudioState, PreviewSurface } from "@/lib/use-glyph-studio";
import { GlyphMark } from "./glyph-icons";

export function GlyphPreviews({ studio: s }: { studio: GlyphStudioState }) {
  return <section className="preview-section" id="guide">
    <div className="section-heading"><div><span className="eyebrow"><span /> Reality check</span><h2>The platform owns the final crop.</h2></div><div className="preview-controls"><div className="segmented compact-switch" aria-label="Preview surface">
      {(["all", "browser", "search", "ios", "pwa"] as PreviewSurface[]).map((item) => <button key={item} type="button" className={s.surface === item ? "active" : ""} onClick={() => s.setSurface(item)}>{item}</button>)}
    </div><button className={`theme-toggle ${s.previewDark ? "active" : ""}`} type="button" onClick={() => s.setPreviewDark((value) => !value)} aria-label="Toggle preview theme"><span className="theme-toggle__dot" /></button></div></div>

    <div className={`preview-grid ${s.previewDark ? "preview-grid--dark" : ""}`}>
      {(s.surface === "all" || s.surface === "browser") && <article className="preview-card browser-preview"><div className="preview-meta"><span>Browser tab</span><strong>16 px · custom favicon shape</strong></div><div className="browser-window"><div className="tab-strip"><div className="tab active-tab"><span className="tiny-icon" style={s.frameStyle}><span style={s.sourceStyle} /></span><span>Glyph — Icon studio</span><span className="tab-close">×</span></div><span className="new-tab">+</span></div><div className="address-bar"><span>⌕</span><span>glyph.manabeakira.com</span></div><div className="browser-body"><GlyphMark compact /><span>Can you still identify the mark?</span></div></div></article>}

      {(s.surface === "all" || s.surface === "search") && <article className="preview-card search-preview"><div className="preview-meta"><span>Google Search</span><strong>48 px source → 28 px display</strong></div><div className="search-result"><div className="search-source"><span className="search-icon google-display-mask" style={{ ...s.squarePlatformStyle, borderRadius: "50%" }}><span style={s.sourceStyle} /></span><div><strong>Glyph</strong><span>glyph.manabeakira.com</span></div></div><h3>Glyph — build an icon system, not just a favicon</h3><p>The exported 48 × 48 file stays square. This circular presentation is applied only by the search surface.</p></div></article>}

      {(s.surface === "all" || s.surface === "ios") && <article className="preview-card ios-preview"><div className="preview-meta"><span>iOS Home Screen</span><strong>180 px square source · OS mask</strong></div><div className="phone-home"><div className="ios-time">9:41</div><div className="app-grid"><div className="app-cell"><span className="ios-icon" style={s.applePreviewStyle}><span style={s.sourceStyle} /></span><span>Glyph</span></div><div className="ghost-app"><span /><small>Notes</small></div><div className="ghost-app ghost-app--dark"><span /><small>Camera</small></div></div></div><p className="platform-caption">Export is square + opaque. The 23% rounded preview is simulated, never baked into the PNG.</p></article>}

      {(s.surface === "all" || s.surface === "pwa") && <article className="preview-card pwa-preview"><div className="preview-meta"><span>PWA maskable</span><strong>Square opaque source · 80% safe circle</strong></div><div className="mask-grid">{(["circle", "squircle", "rounded"] as Shape[]).map((mask) => <div key={mask}><span className={`mask-preview mask-preview--${mask}`} style={{ backgroundColor: s.background, padding: `${s.padding}%` }}><span style={s.sourceStyle} /><i /></span><small>{mask}</small></div>)}</div><p className="platform-caption">Launcher masks vary. Glyph exports one unrounded maskable source and checks important pixels against the guaranteed center circle.</p></article>}
    </div>
  </section>;
}
