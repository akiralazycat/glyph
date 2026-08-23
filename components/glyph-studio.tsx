"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { strToU8, zipSync } from "fflate";

type Shape = "rounded" | "circle" | "square" | "squircle";
type PreviewSurface = "all" | "browser" | "search" | "ios" | "pwa";

type SourceMeta = {
  name: string;
  width: number;
  height: number;
  type: string;
};

type ExportAsset = {
  name: string;
  size: number;
  purpose: string;
  shape?: Shape;
};

const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="142" fill="#111317"/><path d="M143 143h226v61H204v148h105v-49h-65v-61h125v171H143V143Z" fill="#F3F1EA"/></svg>`;
const DEFAULT_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEFAULT_SVG)}`;

const EXPORTS: ExportAsset[] = [
  { name: "favicon-16x16.png", size: 16, purpose: "Browser tab" },
  { name: "favicon-32x32.png", size: 32, purpose: "Browser / bookmark" },
  { name: "apple-touch-icon.png", size: 180, purpose: "iOS / iPadOS" },
  { name: "android-chrome-192x192.png", size: 192, purpose: "PWA" },
  { name: "android-chrome-512x512.png", size: 512, purpose: "PWA" },
  { name: "maskable-icon-512x512.png", size: 512, purpose: "PWA maskable" },
];

function GlyphMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-mark ${compact ? "brand-mark--compact" : ""}`} aria-hidden="true">
      <span />
    </span>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3.25A2.25 2.25 0 0 0 7.25 20h9.5A2.25 2.25 0 0 0 19 17.75V14.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v11m0 0 4.25-4.25M12 15l-4.25-4.25M5 19.5h14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 12.5 3.6 3.6L18.5 7" />
    </svg>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode the selected image."));
    image.src = url;
  });
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function applyClip(ctx: CanvasRenderingContext2D, size: number, shape: Shape) {
  if (shape === "square") return;
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    return;
  }
  const radius = shape === "squircle" ? size * 0.27 : size * 0.18;
  roundedRectPath(ctx, 0, 0, size, size, radius);
  ctx.clip();
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode PNG."))), "image/png");
  });
}

function makeIco(images: Uint8Array[], sizes: number[]) {
  const count = images.length;
  const headerLength = 6 + count * 16;
  const totalLength = headerLength + images.reduce((sum, image) => sum + image.length, 0);
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, count, true);

  let offset = headerLength;
  images.forEach((image, index) => {
    const size = sizes[index];
    const entry = 6 + index * 16;
    view.setUint8(entry, size >= 256 ? 0 : size);
    view.setUint8(entry + 1, size >= 256 ? 0 : size);
    view.setUint8(entry + 2, 0);
    view.setUint8(entry + 3, 0);
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, image.length, true);
    view.setUint32(entry + 12, offset, true);
    bytes.set(image, offset);
    offset += image.length;
  });

  return bytes;
}

function readAsBytes(blob: Blob) {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

export function GlyphStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceUrl, setSourceUrl] = useState(DEFAULT_URL);
  const [sourceMeta, setSourceMeta] = useState<SourceMeta>({
    name: "glyph-demo.svg",
    width: 512,
    height: 512,
    type: "SVG",
  });
  const [shape, setShape] = useState<Shape>("squircle");
  const [background, setBackground] = useState("#111317");
  const [transparent, setTransparent] = useState(false);
  const [padding, setPadding] = useState(14);
  const [scale, setScale] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [safeArea, setSafeArea] = useState(true);
  const [surface, setSurface] = useState<PreviewSurface>("all");
  const [previewDark, setPreviewDark] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    return () => {
      if (sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  const sourceStyle = useMemo(
    () => ({
      backgroundImage: `url("${sourceUrl}")`,
      transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale / 100})`,
    }),
    [offsetX, offsetY, scale, sourceUrl],
  );

  const frameStyle = useMemo(
    () => ({
      backgroundColor: transparent ? "transparent" : background,
      borderRadius:
        shape === "circle" ? "50%" : shape === "square" ? "0" : shape === "squircle" ? "27%" : "18%",
      padding: `${padding}%`,
    }),
    [background, padding, shape, transparent],
  );

  const acceptFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setNotice("Choose an SVG, PNG, JPEG, or WebP image.");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    try {
      const image = await loadImage(nextUrl);
      setSourceUrl((current) => {
        if (current.startsWith("blob:")) URL.revokeObjectURL(current);
        return nextUrl;
      });
      setSourceMeta({
        name: file.name,
        width: image.naturalWidth || 512,
        height: image.naturalHeight || 512,
        type: file.type.split("/")[1]?.toUpperCase() || "IMAGE",
      });
      setNotice(null);
    } catch {
      URL.revokeObjectURL(nextUrl);
      setNotice("That image could not be decoded in this browser.");
    }
  }, []);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void acceptFile(file);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void acceptFile(file);
  };

  const reset = () => {
    if (sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(DEFAULT_URL);
    setSourceMeta({ name: "glyph-demo.svg", width: 512, height: 512, type: "SVG" });
    setShape("squircle");
    setBackground("#111317");
    setTransparent(false);
    setPadding(14);
    setScale(100);
    setOffsetX(0);
    setOffsetY(0);
    setSafeArea(true);
    setNotice(null);
  };

  const renderAsset = useCallback(
    async (size: number, outputShape = shape) => {
      const image = await loadImage(sourceUrl);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");

      ctx.save();
      applyClip(ctx, size, outputShape);
      if (!transparent) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, size, size);
      }

      const inset = size * (padding / 100);
      const available = Math.max(1, size - inset * 2);
      const imageRatio = image.naturalWidth / image.naturalHeight;
      let width = available;
      let height = available;
      if (imageRatio > 1) height = available / imageRatio;
      else width = available * imageRatio;

      width *= scale / 100;
      height *= scale / 100;
      const x = (size - width) / 2 + (offsetX / 100) * size;
      const y = (size - height) / 2 + (offsetY / 100) * size;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, x, y, width, height);
      ctx.restore();

      return canvasToBlob(canvas);
    },
    [background, offsetX, offsetY, padding, scale, shape, sourceUrl, transparent],
  );

  const exportKit = async () => {
    setExporting(true);
    setNotice(null);
    try {
      const files: Record<string, Uint8Array> = {};
      const png16 = await renderAsset(16);
      const png32 = await renderAsset(32);
      files["favicon-16x16.png"] = await readAsBytes(png16);
      files["favicon-32x32.png"] = await readAsBytes(png32);
      files["apple-touch-icon.png"] = await readAsBytes(await renderAsset(180));
      files["android-chrome-192x192.png"] = await readAsBytes(await renderAsset(192));
      files["android-chrome-512x512.png"] = await readAsBytes(await renderAsset(512));
      files["maskable-icon-512x512.png"] = await readAsBytes(await renderAsset(512, "square"));
      files["favicon.ico"] = makeIco([files["favicon-16x16.png"], files["favicon-32x32.png"]], [16, 32]);

      const manifest = {
        name: "Your site",
        short_name: "Your site",
        icons: [
          { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        theme_color: background,
        background_color: background,
        display: "standalone",
      };

      const head = `<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">\n<meta name="theme-color" content="${background}">`;

      const notes = `Glyph export\n============\n\nSource: ${sourceMeta.name}\nGenerated locally in your browser.\n\n1. Copy the PNG and ICO assets into your public web root.\n2. Copy the <head> tags from head.html.\n3. Update name and short_name in site.webmanifest.\n4. Test the 16 px favicon and the maskable preview before shipping.\n`;

      files["site.webmanifest"] = strToU8(JSON.stringify(manifest, null, 2));
      files["head.html"] = strToU8(head);
      files["README.txt"] = strToU8(notes);

      const zip = zipSync(files, { level: 6 });
      const zipBuffer = new ArrayBuffer(zip.byteLength);
      new Uint8Array(zipBuffer).set(zip);
      const url = URL.createObjectURL(new Blob([zipBuffer], { type: "application/zip" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "glyph-icon-kit.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice("Icon kit exported — 6 images, ICO, manifest, and integration snippet.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Glyph home">
          <GlyphMark />
          <span>Glyph</span>
        </a>
        <nav className="nav" aria-label="Primary navigation">
          <a href="#studio">Studio</a>
          <a href="#guide">Guide</a>
          <a href="https://github.com/akiralazycat/glyph" target="_blank" rel="noreferrer">
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span /> Icon systems, not icon files</div>
        <h1>One mark.<br />Every surface.</h1>
        <p>
          Build the favicon people actually see. Tune one source against browser tabs, search results,
          iOS, and PWA masks — then export the complete production kit.
        </p>
        <div className="privacy-note"><span className="privacy-dot" /> Local by design. Your artwork never leaves this browser.</div>
      </section>

      <section className="studio" id="studio" aria-label="Glyph icon studio">
        <aside className="panel source-panel">
          <div className="panel-heading">
            <div><span className="step">01</span><h2>Source</h2></div>
            <button className="text-button" type="button" onClick={reset}>Reset</button>
          </div>

          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onFile} hidden />
          <div
            className={`dropzone ${dragActive ? "is-dragging" : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
          >
            <button className="source-thumb" type="button" onClick={() => inputRef.current?.click()} aria-label="Choose source artwork">
              <span className="source-thumb__inner" style={{ backgroundImage: `url("${sourceUrl}")` }} />
            </button>
            <div className="drop-copy">
              <strong>{sourceMeta.name}</strong>
              <span>{sourceMeta.width} × {sourceMeta.height} · {sourceMeta.type}</span>
            </div>
            <button className="upload-button" type="button" onClick={() => inputRef.current?.click()}>
              <UploadIcon /> Replace
            </button>
          </div>

          <div className="control-group">
            <div className="control-label"><span>Output shape</span><span>{shape}</span></div>
            <div className="segmented shape-switch">
              {(["square", "rounded", "squircle", "circle"] as Shape[]).map((item) => (
                <button key={item} type="button" className={shape === item ? "active" : ""} onClick={() => setShape(item)} aria-label={item}>
                  <span className={`shape-icon shape-icon--${item}`} />
                </button>
              ))}
            </div>
          </div>

          <label className="control-group">
            <div className="control-label"><span>Padding</span><span>{padding}%</span></div>
            <input type="range" min="0" max="30" value={padding} onChange={(event) => setPadding(Number(event.target.value))} />
          </label>

          <label className="control-group">
            <div className="control-label"><span>Optical scale</span><span>{scale}%</span></div>
            <input type="range" min="70" max="145" value={scale} onChange={(event) => setScale(Number(event.target.value))} />
          </label>

          <div className="position-grid">
            <label className="control-group">
              <div className="control-label"><span>X</span><span>{offsetX}</span></div>
              <input type="range" min="-20" max="20" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} />
            </label>
            <label className="control-group">
              <div className="control-label"><span>Y</span><span>{offsetY}</span></div>
              <input type="range" min="-20" max="20" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} />
            </label>
          </div>

          <div className="control-group">
            <div className="control-label"><span>Backdrop</span><span>{transparent ? "Transparent" : background.toUpperCase()}</span></div>
            <div className="color-row">
              <label className="color-well" style={{ background }}>
                <input type="color" value={background} onChange={(event) => { setBackground(event.target.value); setTransparent(false); }} aria-label="Background color" />
              </label>
              {["#111317", "#F5F3ED", "#3157D5", "#D8FF65"].map((color) => (
                <button key={color} className="swatch" type="button" style={{ backgroundColor: color }} onClick={() => { setBackground(color); setTransparent(false); }} aria-label={`Use ${color}`} />
              ))}
              <button className={`transparent-swatch ${transparent ? "active" : ""}`} type="button" onClick={() => setTransparent((value) => !value)} aria-label="Toggle transparent background" />
            </div>
          </div>
        </aside>

        <section className="canvas-panel panel" aria-label="Icon editor preview">
          <div className="panel-heading canvas-heading">
            <div><span className="step">02</span><h2>Optical fit</h2></div>
            <label className="mini-toggle">
              <input type="checkbox" checked={safeArea} onChange={(event) => setSafeArea(event.target.checked)} />
              <span>Safe area</span>
            </label>
          </div>

          <div className="canvas-wrap">
            <div className="ruler ruler--top"><span>0</span><span>256</span><span>512</span></div>
            <div className="ruler ruler--side"><span>0</span><span>256</span><span>512</span></div>
            <div className="artboard-grid">
              <div className="artboard" style={frameStyle}>
                <div className="artwork" style={sourceStyle} />
                {safeArea && <div className="safe-area"><span>maskable safe zone</span></div>}
              </div>
            </div>
            <div className="artboard-caption"><span>512 × 512 master</span><span>{padding}% inset · {scale}% scale</span></div>
          </div>
        </section>

        <aside className="panel export-panel">
          <div className="panel-heading">
            <div><span className="step">03</span><h2>Export</h2></div>
            <span className="ready-badge"><span /> Ready</span>
          </div>

          <div className="asset-list">
            {EXPORTS.map((asset) => (
              <div className="asset-row" key={asset.name}>
                <div className="asset-icon" style={frameStyle}><span style={sourceStyle} /></div>
                <div><strong>{asset.name}</strong><span>{asset.size} × {asset.size} · {asset.purpose}</span></div>
                <span className="asset-check"><CheckIcon /></span>
              </div>
            ))}
            <div className="asset-row asset-row--text">
              <div className="file-icon">{`{}`}</div>
              <div><strong>Web metadata</strong><span>ICO · manifest · head.html</span></div>
              <span className="asset-check"><CheckIcon /></span>
            </div>
          </div>

          <button className="export-button" type="button" onClick={() => void exportKit()} disabled={exporting}>
            <DownloadIcon /> {exporting ? "Building kit…" : "Export icon kit"}
          </button>
          <p className="export-hint">ZIP · production filenames · no account required</p>
          {notice && <p className="notice" role="status">{notice}</p>}
        </aside>
      </section>

      <section className="preview-section" id="guide">
        <div className="section-heading">
          <div>
            <span className="eyebrow"><span /> Reality check</span>
            <h2>See the crop before users do.</h2>
          </div>
          <div className="preview-controls">
            <div className="segmented compact-switch" aria-label="Preview surface">
              {(["all", "browser", "search", "ios", "pwa"] as PreviewSurface[]).map((item) => (
                <button key={item} type="button" className={surface === item ? "active" : ""} onClick={() => setSurface(item)}>{item}</button>
              ))}
            </div>
            <button className={`theme-toggle ${previewDark ? "active" : ""}`} type="button" onClick={() => setPreviewDark((value) => !value)} aria-label="Toggle preview theme">
              <span className="theme-toggle__dot" />
            </button>
          </div>
        </div>

        <div className={`preview-grid ${previewDark ? "preview-grid--dark" : ""}`}>
          {(surface === "all" || surface === "browser") && (
            <article className="preview-card browser-preview">
              <div className="preview-meta"><span>Browser tab</span><strong>16 px</strong></div>
              <div className="browser-window">
                <div className="tab-strip">
                  <div className="tab active-tab">
                    <span className="tiny-icon" style={frameStyle}><span style={sourceStyle} /></span>
                    <span>Glyph — Icon studio</span><span className="tab-close">×</span>
                  </div>
                  <span className="new-tab">+</span>
                </div>
                <div className="address-bar"><span>⌕</span><span>glyph.manabeakira.com</span></div>
                <div className="browser-body"><GlyphMark compact /><span>Can you still identify the mark?</span></div>
              </div>
            </article>
          )}

          {(surface === "all" || surface === "search") && (
            <article className="preview-card search-preview">
              <div className="preview-meta"><span>Google Search</span><strong>28 px · circle mask</strong></div>
              <div className="search-result">
                <div className="search-source">
                  <span className="search-icon" style={{ ...frameStyle, borderRadius: "50%" }}><span style={sourceStyle} /></span>
                  <div><strong>Glyph</strong><span>glyph.manabeakira.com</span></div>
                </div>
                <h3>Glyph — build an icon system, not just a favicon</h3>
                <p>Preview your brand mark at the exact optical conditions where it will be seen.</p>
              </div>
            </article>
          )}

          {(surface === "all" || surface === "ios") && (
            <article className="preview-card ios-preview">
              <div className="preview-meta"><span>iOS Home Screen</span><strong>180 px source</strong></div>
              <div className="phone-home">
                <div className="ios-time">9:41</div>
                <div className="app-grid">
                  <div className="app-cell">
                    <span className="ios-icon" style={{ ...frameStyle, borderRadius: "23%" }}><span style={sourceStyle} /></span>
                    <span>Glyph</span>
                  </div>
                  <div className="ghost-app"><span /><small>Notes</small></div>
                  <div className="ghost-app ghost-app--dark"><span /><small>Camera</small></div>
                </div>
              </div>
            </article>
          )}

          {(surface === "all" || surface === "pwa") && (
            <article className="preview-card pwa-preview">
              <div className="preview-meta"><span>PWA maskable</span><strong>80% safe zone</strong></div>
              <div className="mask-grid">
                {(["circle", "squircle", "rounded"] as Shape[]).map((mask) => (
                  <div key={mask}>
                    <span className={`mask-preview mask-preview--${mask}`} style={{ backgroundColor: transparent ? "#e8e6df" : background }}>
                      <span style={sourceStyle} />
                      <i />
                    </span>
                    <small>{mask}</small>
                  </div>
                ))}
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="principles">
        <article><span className="principle-index">A</span><h3>Design at 16 px.</h3><p>A beautiful 512 px mark can become visual noise in a tab. Glyph keeps the smallest surface visible throughout the process.</p></article>
        <article><span className="principle-index">B</span><h3>Respect the mask.</h3><p>Search engines, launchers, and operating systems all crop differently. Safe areas make those hidden rules tangible.</p></article>
        <article><span className="principle-index">C</span><h3>Ship the boring parts.</h3><p>ICO, manifest, filenames, and head tags are generated with the artwork so finishing the icon system does not become a separate chore.</p></article>
      </section>

      <footer>
        <a className="brand brand--footer" href="#top"><GlyphMark compact /><span>Glyph</span></a>
        <p>One mark, every surface.</p>
        <span>Open source · MIT</span>
      </footer>
    </main>
  );
}
