"use client";

import Link from "next/link";
import { ArrowRight, Star, Building2, Calendar, FileX, Wallet } from "lucide-react";

const upcomingFeatures = [
  {
    icon: Star,
    title: "Patient Reviews",
    description: "Real experiences from real patients to help you choose the right provider."
  },
  {
    icon: Building2,
    title: "Hospital Pages",
    description: "Detailed profiles with pricing history, quality metrics, and patient satisfaction."
  },
  {
    icon: Calendar,
    title: "Payment Plans",
    description: "We negotiate flexible payment terms so you can manage costs over time."
  },
  {
    icon: FileX,
    title: "Appeal Denied Claims",
    description: "Fight back against unfair insurance denials with expert-guided appeals."
  },
  {
    icon: Wallet,
    title: "JustFinancing",
    description: "Fair, transparent financing options without predatory interest rates."
  }
];

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#ECECEC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-1">
              <span className="font-serif text-2xl tracking-tight text-[#002125]">Just</span>
              <span className="font-serif text-2xl tracking-tight text-[#5A9A6B]">Price</span>
            </Link>
            <Link href="/query" className="btn-primary text-sm">
              <span>Search Prices</span>
              <span className="btn-arrow">
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-wider text-[#6B7280] mb-4">Coming Soon</p>
            <h1 className="font-serif text-4xl md:text-5xl text-[#17270C] mb-4" style={{ letterSpacing: '-0.02em' }}>
              We&apos;re building more ways to save
            </h1>
            <p className="text-lg text-[#6B7280]">
              New features to help you navigate healthcare costs.
            </p>
          </div>

          <div className="space-y-4">
            {upcomingFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-5 bg-white border border-[#E5E7EB] rounded-xl hover:border-[#002125]/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#F2FBEF] flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-[#002125]" />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-[#17270C] mb-1">{feature.title}</h3>
                  <p className="text-sm text-[#6B7280]">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-sm text-[#6B7280] mb-6">
              Want early access? We&apos;ll notify you when these features launch.
            </p>
            <Link href="/" className="text-sm text-[#002125] font-medium hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
