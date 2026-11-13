import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Consolidate Drive",
  description: "Dokumentenansicht für Consolidate-Tasks",
  appleWebApp: {
    capable: true,
    title: "Consolidate Drive",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f9fa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-dvh antialiased`}
      style={
        {
          "--font-sans": "var(--font-geist-sans)",
        } as React.CSSProperties
      }
    >
      <body className="flex h-dvh min-h-dvh flex-col overflow-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
