export function GlyphMark({ compact = false }: { compact?: boolean }) {
  return <span className={`brand-mark ${compact ? "brand-mark--compact" : ""}`} aria-hidden="true"><span /></span>;
}

export function UploadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3.25A2.25 2.25 0 0 0 7.25 20h9.5A2.25 2.25 0 0 0 19 17.75V14.5" /></svg>;
}

export function DownloadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0 4.25-4.25M12 15l-4.25-4.25M5 19.5h14" /></svg>;
}

export function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 3.6 3.6L18.5 7" /></svg>;
}
