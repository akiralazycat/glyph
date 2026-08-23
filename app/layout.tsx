import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glyph — Icon studio for every surface",
  description:
    "Generate, inspect, and export production-ready favicons, Apple touch icons, and PWA icons from one source image.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
