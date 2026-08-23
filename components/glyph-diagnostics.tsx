import type { CSSProperties } from "react";
import { scoreLabel } from "@/lib/icon-engine";
import type { GlyphStudioState } from "@/lib/use-glyph-studio";

export function GlyphDiagnostics({ studio: s }: { studio: GlyphStudioState }) {
  const diagnostic = s.diagnostic;
  return <>
    <section className="diagnostic-section" id="diagnostics">
      <div className="diagnostic-heading"><div><span className="eyebrow"><span /> Optical diagnostics</span><h2>Measure the mark at the sizes that matter.</h2></div><button className="diagnostic-button" type="button" onClick={() => void s.runDiagnostics()} disabled={s.diagnosing}>{s.diagnosing ? "Measuring…" : "Run diagnostic"}</button></div>
      <div className="diagnostic-board">
        <aside className="score-panel"><div className="score-ring" style={{ "--score": diagnostic?.overall ?? 0 } as CSSProperties}><strong>{diagnostic?.overall ?? "—"}</strong><span>/100</span></div><div><span className="score-kicker">Cross-surface score</span><h3>{diagnostic ? scoreLabel(diagnostic.overall) : "Measuring"}</h3><p>Weighted toward the 16 px tab, Google 48 px source, Apple 180 px source, and PWA safe-circle survival.</p></div></aside>
        <div className="actual-size-panel"><div className="actual-size-header"><span>Actual CSS-pixel comparison</span><strong>No enlargement</strong></div><div className="actual-size-strip">
          {(diagnostic?.items ?? []).map((item) => {
            const style = item.profile === "favicon" ? s.frameStyle : item.profile === "apple" ? s.applePreviewStyle : s.squarePlatformStyle;
            return <div className="actual-size-item" key={item.key}><div className="actual-size-stage"><span className="actual-icon" style={{ ...style, width: item.size, height: item.size }}><span style={s.sourceStyle} /></span></div><div className="actual-size-copy"><strong>{item.size}px</strong><span>{item.label}</span><em className={`score-pill score-pill--${item.score >= 80 ? "good" : item.score >= 68 ? "mid" : "low"}`}>{item.score}</em></div></div>;
          })}
        </div></div>
      </div>

      {diagnostic && <div className="metric-grid">
        {diagnostic.items.map((item) => <article className="metric-card" key={item.key}><div className="metric-card__top"><div><span>{item.label}</span><strong>{item.size}px</strong></div><b>{item.score}</b></div><div className="metric-bars"><label><span>Contrast</span><i><b style={{ width: `${item.contrast}%` }} /></i><em>{item.contrast}</em></label><label><span>Balance</span><i><b style={{ width: `${item.balance}%` }} /></i><em>{item.balance}</em></label><label><span>Edge safety</span><i><b style={{ width: `${item.edgeSafety}%` }} /></i><em>{item.edgeSafety}</em></label></div><p>{item.density}% of pixels differ from the detected background.</p></article>)}
        <article className="metric-card maskable-metric"><div className="metric-card__top"><div><span>PWA maskable</span><strong>80% safe circle</strong></div><b>{diagnostic.maskableSafety}</b></div><div className="safe-orbit"><span style={{ backgroundColor: s.background }}><i style={s.sourceStyle} /><b /></span></div><p>{diagnostic.maskableSafety >= 88 ? "Important artwork is mostly contained in the guaranteed safe region." : "Artwork reaches outside the guaranteed safe circle; some launcher masks may crop it."}</p></article>
      </div>}

      {diagnostic && <div className="diagnostic-notes"><strong>Glyph notes</strong><div>{diagnostic.suggestions.map((suggestion) => <p key={suggestion}>{suggestion}</p>)}</div></div>}
    </section>

    <section className="rules-section">
      <article><span className="rule-platform">GOOGLE</span><h3>48 × 48, not 28 × 28.</h3><p>Export the square multiple-of-48 source. The search result preview simulates its smaller presentation separately.</p></article>
      <article><span className="rule-platform">APPLE</span><h3>Do not bake the corner radius.</h3><p>Apple Touch Icon is emitted square and opaque. iOS owns the final rounded mask, so Glyph only rounds the preview.</p></article>
      <article><span className="rule-platform">PWA</span><h3>Any and maskable are different assets.</h3><p>Both stay square. Maskable is forced opaque and gets its own safe-circle diagnostic rather than borrowing favicon styling.</p></article>
      <article><span className="rule-platform">SAFARI</span><h3>A separate monochrome vector.</h3><p>SVG input is sanitized and minified, then a background-stripped single-color mask is generated for pinned tabs.</p></article>
    </section>
  </>;
}
