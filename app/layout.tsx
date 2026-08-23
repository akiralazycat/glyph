import type { Metadata } from "next";
import "./globals.css";
import "./diagnostics.css";

export const metadata: Metadata = {
  title: "Glyph — Icon studio for every surface",
  description:
    "Generate, inspect, diagnose, and export platform-aware favicons, Google Search icons, Apple touch icons, PWA masks, and pinned-tab SVGs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
