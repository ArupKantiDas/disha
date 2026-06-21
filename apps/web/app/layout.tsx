import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Disha pick the better option before you spend a rupee",
  description:
    "An India-specific pre-decision carbon advisor. State a trip or purchase, get your real options ranked across carbon, cost, and time.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-coal">{children}</body>
    </html>
  );
}
