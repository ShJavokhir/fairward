import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
