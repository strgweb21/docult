import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Docult - Chill.....",
  description: "just watch and chill/ui.",
  keywords: ["docult", "sex", "porn"],
  authors: [{ name: "pribumi" }],
  icons: {
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjsxNTAiIHZpZXdCb3g9IjAgMCAxNTAgMTUwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9Ijc1IiBjeT0iNzUiIHI9IjYwIiBmaWxsPSIjMDAwMDAwIi8+PHBhdGggZD0iTTYwIDUwTDEwMCA3NUw2MCAxMDBWNTBaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==",
  },
  openGraph: {
    title: "Docult - Chill.....",
    description: "just watch and chill",
    url: "https://chat.z.ai",
    siteName: "Z.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Docult - Chill.....",
    description: "just watch and chill",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${mono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
