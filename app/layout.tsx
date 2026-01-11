import type { Metadata } from "next";
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
  title: "JustPrice - Your AI Healthcare Advocate",
  description: "Compare hospital prices, spot billing errors, and fight unfair medical charges. JustPrice helps you navigate healthcare costs with confidence.",
  keywords: ["healthcare", "medical bills", "hospital prices", "billing errors", "healthcare costs", "price comparison"],
  openGraph: {
    title: "JustPrice - Your AI Healthcare Advocate",
    description: "Compare hospital prices, spot billing errors, and fight unfair medical charges.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
