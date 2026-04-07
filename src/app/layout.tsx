import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tech Events Radar",
  description: "Tech networking events in Toronto, SF, and NYC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
