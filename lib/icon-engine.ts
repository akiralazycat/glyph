export type Shape = "rounded" | "circle" | "square" | "squircle";
export type RenderProfile = "favicon" | "google" | "apple" | "pwa-any" | "pwa-maskable";

export type DiagnosticItem = {
  key: string;
  label: string;
  size: number;
  profile: RenderProfile;
  score: number;
  density: number;
  contrast: number;
  balance: number;
  edgeSafety: number;
};

export type DiagnosticResult = {
  overall: number;
  maskableSafety: number;
  items: DiagnosticItem[];
  suggestions: string[];
};

export type RenderConfig = {
  sourceUrl: string;
  size: number;
  profile: RenderProfile;
  shape: Shape;
  background: string;
  transparent: boolean;
  padding: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="142" fill="#111317"/><path d="M143 143h226v61H204v148h105v-49h-65v-61h125v171H143V143Z" fill="#F3F1EA"/></svg>`;
export const DEFAULT_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEFAULT_SVG)}`;

export const EXPORTS = [
  { name: "favicon-16x16.png", size: 16, purpose: "Browser tab", profile: "favicon" as RenderProfile },
  { name: "favicon-32x32.png", size: 32, purpose: "Browser / bookmark", profile: "favicon" as RenderProfile },
  { name: "favicon-48x48.png", size: 48, purpose: "Google Search source", profile: "google" as RenderProfile },
  { name: "apple-touch-icon.png", size: 180, purpose: "iOS · square / opaque", profile: "apple" as RenderProfile },
  { name: "android-chrome-192x192.png", size: 192, purpose: "PWA any · square", profile: "pwa-any" as RenderProfile },
  { name: "android-chrome-512x512.png", size: 512, purpose: "PWA any · square", profile: "pwa-any" as RenderProfile },
  { name: "maskable-icon-512x512.png", size: 512, purpose: "PWA maskable · opaque", profile: "pwa-maskable" as RenderProfile },
];

export function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(bytes > 10240 ? 0 : 1)} KB`;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode the selected image."));
    image.src = url;
  });
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
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
  roundedRectPath(ctx, 0, 0, size, size, shape === "squircle" ? size * 0.27 : size * 0.18);
  ctx.clip();
}

export async function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode PNG."))), "image/png");
  });
}

export function readAsBytes(blob: Blob) {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

export function makeIco(images: Uint8Array[], sizes: number[]) {
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

function parseDimension(value: string | null) {
  if (!value) return null;
  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : null;
}

export function optimizeSvgText(input: string) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(input.replace(/<!--[\s\S]*?-->/g, ""), "image/svg+xml");
  if (documentNode.querySelector("parsererror")) throw new Error("The SVG source is not valid XML.");
  const svg = documentNode.documentElement;
  if (svg.nodeName.toLowerCase() !== "svg") throw new Error("The selected file is not an SVG document.");

  svg.querySelectorAll("script, foreignObject, metadata").forEach((node) => node.remove());
  [svg, ...svg.querySelectorAll("*")].forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on")) element.removeAttribute(attribute.name);
      if ((name === "href" || name === "xlink:href") && /^(javascript:|https?:|data:)/.test(value)) element.removeAttribute(attribute.name);
    });
  });

  if (!svg.getAttribute("viewBox")) {
    const width = parseDimension(svg.getAttribute("width"));
    const height = parseDimension(svg.getAttribute("height"));
    if (width && height) svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }
  if (svg.getAttribute("viewBox")) {
    svg.removeAttribute("width");
    svg.removeAttribute("height");
  }
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(svg).replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").replace(/\s+\/>/g, "/>").trim();
}

function isLikelyFullCanvasRect(rect: Element, viewBox: string | null) {
  const x = Number(rect.getAttribute("x") || 0);
  const y = Number(rect.getAttribute("y") || 0);
  const widthRaw = rect.getAttribute("width") || "";
  const heightRaw = rect.getAttribute("height") || "";
  if (x !== 0 || y !== 0) return false;
  if (widthRaw === "100%" && heightRaw === "100%") return true;
  if (!viewBox) return false;
  const parts = viewBox.split(/[ ,]+/).map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return parseDimension(widthRaw) === parts[2] && parseDimension(heightRaw) === parts[3];
}

export function makePinnedTabSvg(svgText: string) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(optimizeSvgText(svgText), "image/svg+xml");
  const svg = documentNode.documentElement;
  const visualChildren = [...svg.children].filter((node) => !["defs", "style", "title", "desc"].includes(node.tagName.toLowerCase()));
  const firstRect = visualChildren.find((node) => node.tagName.toLowerCase() === "rect");
  if (visualChildren.length > 1 && firstRect && isLikelyFullCanvasRect(firstRect, svg.getAttribute("viewBox"))) firstRect.remove();

  svg.setAttribute("fill", "#000000");
  svg.querySelectorAll("*").forEach((element) => {
    const tag = element.tagName.toLowerCase();
    if (["defs", "clippath", "mask", "lineargradient", "radialgradient", "stop"].includes(tag)) return;
    const fill = element.getAttribute("fill");
    const stroke = element.getAttribute("stroke");
    if (fill !== "none") element.setAttribute("fill", "#000000");
    if (stroke && stroke !== "none") element.setAttribute("stroke", "#000000");
    const style = element.getAttribute("style");
    if (style) {
      element.setAttribute("style", style
        .replace(/fill\s*:\s*([^;]+)/gi, (match, value: string) => value.trim().toLowerCase() === "none" ? match : "fill:#000000")
        .replace(/stroke\s*:\s*([^;]+)/gi, (match, value: string) => value.trim().toLowerCase() === "none" ? match : "stroke:#000000"));
    }
    element.removeAttribute("opacity");
    element.removeAttribute("fill-opacity");
  });
  return new XMLSerializer().serializeToString(svg).replace(/>\s+</g, "><").trim();
}

export async function renderIconCanvas(config: RenderConfig) {
  const { sourceUrl, size, profile, shape, background, transparent, padding, scale, offsetX, offsetY } = config;
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  if (profile === "favicon") applyClip(ctx, size, shape);
  if (profile === "apple" || profile === "pwa-maskable" || !transparent) {
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
  return canvas;
}

function colorDistance(a: number[], b: number[]) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  const da = (a[3] - b[3]) * 0.75;
  return Math.sqrt(dr * dr + dg * dg + db * db + da * da);
}

export function analyzeCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { score: 0, density: 0, contrast: 0, balance: 0, edgeSafety: 0, outsideSafe: 0 };
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const buckets = new Map<string, { count: number; rgba: number[] }>();
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const index = pixel * 4;
    const rgba = [data[index], data[index + 1], data[index + 2], data[index + 3]];
    const key = rgba.map((channel) => Math.round(channel / 24) * 24).join(":");
    const bucket = buckets.get(key);
    if (bucket) bucket.count += 1;
    else buckets.set(key, { count: 1, rgba });
  }
  const background = [...buckets.values()].sort((a, b) => b.count - a.count)[0]?.rgba ?? [0, 0, 0, 0];
  let active = 0, edgeActive = 0, contrastTotal = 0, sumX = 0, sumY = 0, outsideSafe = 0;
  const safeRadius = width * 0.4, centerX = width / 2, centerY = height / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const pixel = [data[index], data[index + 1], data[index + 2], data[index + 3]];
      const distance = colorDistance(pixel, background);
      if (distance <= 42) continue;
      active += 1; contrastTotal += distance; sumX += x; sumY += y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) edgeActive += 1;
      if (Math.hypot(x + 0.5 - centerX, y + 0.5 - centerY) > safeRadius) outsideSafe += 1;
    }
  }
  if (!active) return { score: 0, density: 0, contrast: 0, balance: 0, edgeSafety: 100, outsideSafe: 0 };
  const densityRatio = active / (width * height);
  let densityScore = 100;
  if (densityRatio < 0.06) densityScore = 48;
  else if (densityRatio < 0.1) densityScore = 68;
  else if (densityRatio < 0.14) densityScore = 84;
  else if (densityRatio > 0.78) densityScore = 56;
  else if (densityRatio > 0.68) densityScore = 74;
  else if (densityRatio > 0.58) densityScore = 88;
  const contrastScore = clamp(((contrastTotal / active) / 165) * 100);
  const centerOffset = Math.hypot(sumX / active - centerX, sumY / active - centerY) / Math.max(width, height);
  const balanceScore = clamp(100 - centerOffset * 430);
  const edgeScore = clamp(100 - (edgeActive / Math.max(1, width * 2 + height * 2 - 4)) * 260);
  return {
    score: Math.round(densityScore * 0.28 + contrastScore * 0.34 + balanceScore * 0.22 + edgeScore * 0.16),
    density: Math.round(densityRatio * 100),
    contrast: Math.round(contrastScore),
    balance: Math.round(balanceScore),
    edgeSafety: Math.round(edgeScore),
    outsideSafe: outsideSafe / active,
  };
}

export function scoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Strong";
  if (score >= 68) return "Usable";
  return "Review";
}
