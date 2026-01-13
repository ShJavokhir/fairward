import type { Metadata } from "next";
import { PT_Serif, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const ptSerif = PT_Serif({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

const schibstedGrotesk = Schibsted_Grotesk({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
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
    <html lang="en" className={`${ptSerif.variable} ${schibstedGrotesk.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
