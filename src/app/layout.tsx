import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Localflix",
  description: "A pixel-focused Netflix interface clone built with mock data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full bg-[#141414] text-white">{children}</body>
    </html>
  );
}
