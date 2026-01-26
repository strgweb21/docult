import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
