import { EXPORTS, formatBytes, type Shape } from "@/lib/icon-engine";
import type { GlyphStudioState } from "@/lib/use-glyph-studio";
import { CheckIcon, DownloadIcon, UploadIcon } from "./glyph-icons";

export function StudioPanels({ studio }: { studio: GlyphStudioState }) {
  return <section className="studio" id="studio" aria-label="Glyph icon studio">
    <SourcePanel studio={studio} />
    <CanvasPanel studio={studio} />
    <ExportPanel studio={studio} />
  </section>;
}

function SourcePanel({ studio: s }: { studio: GlyphStudioState }) {
  return <aside className="panel source-panel">
    <div className="panel-heading"><div><span className="step">01</span><h2>Source</h2></div><button className="text-button" type="button" onClick={s.reset}>Reset</button></div>
    <input ref={s.inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={s.onFile} hidden />
    <div className={`dropzone ${s.dragActive ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); s.setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => s.setDragActive(false)} onDrop={s.onDrop}>
      <button className="source-thumb" type="button" onClick={() => s.inputRef.current?.click()} aria-label="Choose source artwork"><span className="source-thumb__inner" style={{ backgroundImage: `url("${s.sourceUrl}")` }} /></button>
      <div className="drop-copy"><strong>{s.sourceMeta.name}</strong><span>{s.sourceMeta.width} × {s.sourceMeta.height} · {s.sourceMeta.type} · {formatBytes(s.sourceMeta.bytes)}</span></div>
      <button className="upload-button" type="button" onClick={() => s.inputRef.current?.click()}><UploadIcon /> Replace</button>
    </div>
    <div className="vector-status"><span className={`vector-status__dot ${s.sourceSvg ? "is-ready" : ""}`} /><div><strong>{s.sourceSvg ? "Vector pipeline ready" : "Raster pipeline"}</strong><span>{s.sourceSvg ? `SVG sanitized · ~${s.optimizationPercent}% smaller on export` : "PNG exports available · pinned-tab vector requires SVG"}</span></div></div>

    <div className="control-group"><div className="control-label"><span>Favicon shape</span><span>{s.shape}</span></div><div className="segmented shape-switch">
      {(["square", "rounded", "squircle", "circle"] as Shape[]).map((item) => <button key={item} type="button" className={s.shape === item ? "active" : ""} onClick={() => s.setShape(item)} aria-label={item}><span className={`shape-icon shape-icon--${item}`} /></button>)}
    </div></div>
    <label className="control-group"><div className="control-label"><span>Padding</span><span>{s.padding}%</span></div><input type="range" min="0" max="30" value={s.padding} onChange={(event) => s.setPadding(Number(event.target.value))} /></label>
    <label className="control-group"><div className="control-label"><span>Optical scale</span><span>{s.scale}%</span></div><input type="range" min="70" max="145" value={s.scale} onChange={(event) => s.setScale(Number(event.target.value))} /></label>
    <div className="position-grid">
      <label className="control-group"><div className="control-label"><span>X</span><span>{s.offsetX}</span></div><input type="range" min="-20" max="20" value={s.offsetX} onChange={(event) => s.setOffsetX(Number(event.target.value))} /></label>
      <label className="control-group"><div className="control-label"><span>Y</span><span>{s.offsetY}</span></div><input type="range" min="-20" max="20" value={s.offsetY} onChange={(event) => s.setOffsetY(Number(event.target.value))} /></label>
    </div>
    <div className="control-group"><div className="control-label"><span>Backdrop</span><span>{s.transparent ? "Transparent" : s.background.toUpperCase()}</span></div><div className="color-row">
      <label className="color-well" style={{ background: s.background }}><input type="color" value={s.background} onChange={(event) => { s.setBackground(event.target.value); s.setTransparent(false); }} aria-label="Background color" /></label>
      {["#111317", "#F5F3ED", "#3157D5", "#D8FF65"].map((color) => <button key={color} className="swatch" type="button" style={{ backgroundColor: color }} onClick={() => { s.setBackground(color); s.setTransparent(false); }} aria-label={`Use ${color}`} />)}
      <button className={`transparent-swatch ${s.transparent ? "active" : ""}`} type="button" onClick={() => s.setTransparent((value) => !value)} aria-label="Toggle transparent background" />
    </div></div>
    <div className="control-group mask-color-control"><div className="control-label"><span>Pinned-tab color</span><span>{s.maskColor.toUpperCase()}</span></div><label className="mask-color-well" style={{ background: s.maskColor }}><input type="color" value={s.maskColor} onChange={(event) => s.setMaskColor(event.target.value)} aria-label="Safari pinned tab color" /></label></div>
  </aside>;
}

function CanvasPanel({ studio: s }: { studio: GlyphStudioState }) {
  return <section className="canvas-panel panel" aria-label="Icon editor preview">
    <div className="panel-heading canvas-heading"><div><span className="step">02</span><h2>Optical fit</h2></div><label className="mini-toggle"><input type="checkbox" checked={s.safeArea} onChange={(event) => s.setSafeArea(event.target.checked)} /><span>PWA safe circle</span></label></div>
    <div className="canvas-wrap"><div className="ruler ruler--top"><span>0</span><span>256</span><span>512</span></div><div className="ruler ruler--side"><span>0</span><span>256</span><span>512</span></div>
      <div className="artboard-grid"><div className="artboard" style={s.frameStyle}><div className="artwork" style={s.sourceStyle} />{s.safeArea && <div className="safe-area"><span>80% maskable safe circle</span></div>}</div></div>
      <div className="artboard-caption"><span>512 × 512 master</span><span>{s.padding}% inset · {s.scale}% scale</span></div>
    </div>
  </section>;
}

function ExportPanel({ studio: s }: { studio: GlyphStudioState }) {
  return <aside className="panel export-panel">
    <div className="panel-heading"><div><span className="step">03</span><h2>Export</h2></div><span className="ready-badge"><span /> Platform aware</span></div>
    <div className="asset-list">
      {EXPORTS.map((asset) => {
        const style = asset.profile === "favicon" ? s.frameStyle : asset.profile === "apple" ? s.applePreviewStyle : s.squarePlatformStyle;
        return <div className="asset-row" key={asset.name}><div className="asset-icon" style={style}><span style={s.sourceStyle} /></div><div><strong>{asset.name}</strong><span>{asset.size} × {asset.size} · {asset.purpose}</span></div><span className="asset-check"><CheckIcon /></span></div>;
      })}
      <div className="asset-row asset-row--text"><div className="file-icon">SVG</div><div><strong>Vector outputs</strong><span>{s.sourceSvg ? "icon.svg · pinned-tab.svg" : "Upload SVG to enable"}</span></div><span className={`asset-check ${s.sourceSvg ? "" : "asset-check--muted"}`}><CheckIcon /></span></div>
      <div className="asset-row asset-row--text"><div className="file-icon">{`{}`}</div><div><strong>Web metadata</strong><span>ICO · manifest · diagnostic.json · head.html</span></div><span className="asset-check"><CheckIcon /></span></div>
    </div>
    <button className="export-button" type="button" onClick={() => void s.exportKit()} disabled={s.exporting}><DownloadIcon /> {s.exporting ? "Building kit…" : "Export platform kit"}</button>
    <p className="export-hint">ZIP · Google 48 · Apple/PWA profiles · SVG mask</p>{s.notice && <p className="notice" role="status">{s.notice}</p>}
  </aside>;
}
