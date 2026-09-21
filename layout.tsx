import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Snowball — Compound Interest Calculator",
  description:
    "Watch small deposits compound into wealth. A precise, interactive compound interest calculator with charts and year-by-year breakdowns.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='%230A0B0E'/><g stroke='%23BEF264' stroke-width='9' stroke-linecap='round'><path d='M50 20v60'/><path d='M24 35l52 30'/><path d='M76 35L24 65'/></g></svg>",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
