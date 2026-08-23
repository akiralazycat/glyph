"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { strToU8, zipSync } from "fflate";
import {
  DEFAULT_SVG,
  DEFAULT_URL,
  EXPORTS,
  analyzeCanvas,
  canvasToBlob,
  clamp,
  loadImage,
  makeIco,
  makePinnedTabSvg,
  optimizeSvgText,
  readAsBytes,
  renderIconCanvas,
  scoreLabel,
  type DiagnosticResult,
  type RenderProfile,
  type Shape,
} from "@/lib/icon-engine";

export type PreviewSurface = "all" | "browser" | "search" | "ios" | "pwa";
export type SourceMeta = { name: string; width: number; height: number; type: string; bytes: number };

export function useGlyphStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceUrl, setSourceUrl] = useState(DEFAULT_URL);
  const [sourceMeta, setSourceMeta] = useState<SourceMeta>({ name: "glyph-demo.svg", width: 512, height: 512, type: "SVG", bytes: new Blob([DEFAULT_SVG]).size });
  const [sourceSvg, setSourceSvg] = useState<string | null>(DEFAULT_SVG);
  const [optimizedSvg, setOptimizedSvg] = useState(DEFAULT_SVG);
  const [shape, setShape] = useState<Shape>("squircle");
  const [background, setBackground] = useState("#111317");
  const [maskColor, setMaskColor] = useState("#111317");
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
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);

  useEffect(() => () => { if (sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);

  const sourceStyle = useMemo(() => ({
    backgroundImage: `url("${sourceUrl}")`,
    transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale / 100})`,
  }), [offsetX, offsetY, scale, sourceUrl]);

  const radiusForShape = useCallback((value: Shape) => value === "circle" ? "50%" : value === "square" ? "0" : value === "squircle" ? "27%" : "18%", []);
  const frameStyle = useMemo(() => ({ backgroundColor: transparent ? "transparent" : background, borderRadius: radiusForShape(shape), padding: `${padding}%` }), [background, padding, radiusForShape, shape, transparent]);
  const squarePlatformStyle = useMemo(() => ({ backgroundColor: transparent ? "transparent" : background, borderRadius: "0", padding: `${padding}%` }), [background, padding, transparent]);
  const applePreviewStyle = useMemo(() => ({ backgroundColor: background, borderRadius: "23%", padding: `${padding}%` }), [background, padding]);

  const acceptFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".svg")) {
      setNotice("Choose an SVG, PNG, JPEG, or WebP image.");
      return;
    }
    let nextUrl: string | null = null;
    try {
      let svgText: string | null = null;
      let nextType = file.type.split("/")[1]?.toUpperCase() || "IMAGE";
      if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
        svgText = optimizeSvgText(await file.text());
        nextType = "SVG";
        nextUrl = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" }));
      } else nextUrl = URL.createObjectURL(file);
      const image = await loadImage(nextUrl);
      setSourceUrl((current) => {
        if (current.startsWith("blob:")) URL.revokeObjectURL(current);
        return nextUrl as string;
      });
      setSourceMeta({ name: file.name, width: image.naturalWidth || 512, height: image.naturalHeight || 512, type: nextType, bytes: file.size });
      setSourceSvg(svgText);
      setOptimizedSvg(svgText || "");
      setNotice(svgText ? "SVG sanitized and optimized locally." : null);
    } catch (error) {
      if (nextUrl) URL.revokeObjectURL(nextUrl);
      setNotice(error instanceof Error ? error.message : "That image could not be decoded in this browser.");
    }
  }, []);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void acceptFile(file);
    event.target.value = "";
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void acceptFile(file);
  };

  const reset = () => {
    if (sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(DEFAULT_URL);
    setSourceMeta({ name: "glyph-demo.svg", width: 512, height: 512, type: "SVG", bytes: new Blob([DEFAULT_SVG]).size });
    setSourceSvg(DEFAULT_SVG); setOptimizedSvg(DEFAULT_SVG); setShape("squircle"); setBackground("#111317"); setMaskColor("#111317"); setTransparent(false);
    setPadding(14); setScale(100); setOffsetX(0); setOffsetY(0); setSafeArea(true); setDiagnostic(null); setNotice(null);
  };

  const renderCanvas = useCallback((size: number, profile: RenderProfile) => renderIconCanvas({ sourceUrl, size, profile, shape, background, transparent, padding, scale, offsetX, offsetY }), [background, offsetX, offsetY, padding, scale, shape, sourceUrl, transparent]);
  const renderBlob = useCallback(async (size: number, profile: RenderProfile) => canvasToBlob(await renderCanvas(size, profile)), [renderCanvas]);

  const runDiagnostics = useCallback(async () => {
    setDiagnosing(true);
    try {
      const targets = [
        { key: "tab", label: "Browser tab", size: 16, profile: "favicon" as RenderProfile },
        { key: "search-display", label: "Search display", size: 28, profile: "google" as RenderProfile },
        { key: "google-source", label: "Google source", size: 48, profile: "google" as RenderProfile },
        { key: "apple", label: "Apple source", size: 180, profile: "apple" as RenderProfile },
      ];
      const items = [];
      for (const target of targets) items.push({ ...target, ...analyzeCanvas(await renderCanvas(target.size, target.profile)) });
      const maskMetrics = analyzeCanvas(await renderCanvas(160, "pwa-maskable"));
      const maskableSafety = Math.round(clamp(100 - maskMetrics.outsideSafe * 155));
      const overall = Math.round(items[0].score * .34 + items[1].score * .18 + items[2].score * .22 + items[3].score * .16 + maskableSafety * .1);
      const suggestions: string[] = [];
      if (items[0].score < 75) suggestions.push("The 16 px tab version is losing clarity. Try less padding, a larger optical scale, or a simpler mark.");
      if (items[2].score < 78) suggestions.push("The 48 px Google source is visually weak. Increase contrast or recenter the mark before export.");
      if (maskableSafety < 88) suggestions.push("Important pixels extend beyond the PWA maskable safe circle. Increase padding or reduce optical scale.");
      if (Math.abs(offsetX) > 7 || Math.abs(offsetY) > 7) suggestions.push("Large optical offsets can look balanced at one size but drift at smaller surfaces.");
      if (transparent) suggestions.push("Apple Touch Icon and maskable PWA exports will receive the selected backdrop because those profiles require an opaque base.");
      if (!sourceSvg) suggestions.push("Pinned-tab SVG cannot preserve true vector geometry from a raster source. Upload SVG for the complete vector export set.");
      if (!suggestions.length) suggestions.push("No major cross-surface issue detected. Check the four actual-size samples once more before shipping.");
      setDiagnostic({ overall, maskableSafety, items, suggestions });
    } finally { setDiagnosing(false); }
  }, [offsetX, offsetY, renderCanvas, sourceSvg, transparent]);

  useEffect(() => {
    const timer = window.setTimeout(() => void runDiagnostics(), 280);
    return () => window.clearTimeout(timer);
  }, [runDiagnostics]);

  const exportKit = async () => {
    setExporting(true); setNotice(null);
    try {
      const files: Record<string, Uint8Array> = {};
      for (const asset of EXPORTS) files[asset.name] = await readAsBytes(await renderBlob(asset.size, asset.profile));
      files["favicon.ico"] = makeIco([files["favicon-16x16.png"], files["favicon-32x32.png"], files["favicon-48x48.png"]], [16, 32, 48]);
      let vectorNote = "Raster source: vector outputs were omitted.";
      if (sourceSvg) {
        files["icon.svg"] = strToU8(optimizeSvgText(sourceSvg));
        files["safari-pinned-tab.svg"] = strToU8(makePinnedTabSvg(sourceSvg));
        vectorNote = "icon.svg is sanitized/minified; safari-pinned-tab.svg is a monochrome vector mask.";
      }
      const manifest = {
        name: "Your site", short_name: "Your site",
        icons: [
          { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        theme_color: background, background_color: background, display: "standalone",
      };
      const vectorHead = sourceSvg ? `\n<link rel="icon" href="/icon.svg" type="image/svg+xml">\n<link rel="mask-icon" href="/safari-pinned-tab.svg" color="${maskColor}">` : "";
      const head = `<link rel="icon" href="/favicon.ico" sizes="any">${vectorHead}\n<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">\n<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">\n<meta name="theme-color" content="${background}">`;
      const diagnosticText = diagnostic ? `\nDiagnostic score: ${diagnostic.overall}/100 (${scoreLabel(diagnostic.overall)})\nMaskable safety: ${diagnostic.maskableSafety}/100\n${diagnostic.items.map((item) => `${item.label} ${item.size}px: ${item.score}/100`).join("\n")}\n` : "";
      const notes = `Glyph export\n============\n\nSource: ${sourceMeta.name}\nGenerated locally in your browser.\n\nPlatform rules\n--------------\n- Google: favicon-48x48.png is an unmasked square source; Google applies presentation cropping.\n- Apple: apple-touch-icon.png is square and opaque; iOS applies its own rounded mask.\n- PWA any: square source assets, without baked launcher rounding.\n- PWA maskable: square and opaque; validate important content against the 80% safe circle.\n- Safari pinned tab: ${vectorNote}\n${diagnosticText}\n1. Copy the assets into your public web root.\n2. Copy the <head> tags from head.html.\n3. Update name and short_name in site.webmanifest.\n4. Re-run Glyph diagnostics after changing the source artwork.\n`;
      files["site.webmanifest"] = strToU8(JSON.stringify(manifest, null, 2));
      files["head.html"] = strToU8(head); files["README.txt"] = strToU8(notes);
      if (diagnostic) files["diagnostic.json"] = strToU8(JSON.stringify(diagnostic, null, 2));
      const zip = zipSync(files, { level: 6 });
      const zipBuffer = new ArrayBuffer(zip.byteLength); new Uint8Array(zipBuffer).set(zip);
      const url = URL.createObjectURL(new Blob([zipBuffer], { type: "application/zip" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "glyph-icon-kit.zip"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setNotice(`Icon kit exported — ${Object.keys(files).length} production files.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Export failed."); }
    finally { setExporting(false); }
  };

  const optimizationPercent = sourceSvg ? Math.max(0, Math.round((1 - new Blob([optimizedSvg]).size / Math.max(1, sourceMeta.bytes)) * 100)) : 0;
  return {
    inputRef, sourceUrl, sourceMeta, sourceSvg, shape, setShape, background, setBackground, maskColor, setMaskColor, transparent, setTransparent,
    padding, setPadding, scale, setScale, offsetX, setOffsetX, offsetY, setOffsetY, safeArea, setSafeArea, surface, setSurface,
    previewDark, setPreviewDark, exporting, notice, dragActive, setDragActive, diagnostic, diagnosing, sourceStyle, frameStyle, squarePlatformStyle,
    applePreviewStyle, optimizationPercent, onFile, onDrop, reset, exportKit, runDiagnostics,
  };
}

export type GlyphStudioState = ReturnType<typeof useGlyphStudio>;
