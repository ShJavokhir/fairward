"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/query${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-slate-800 overflow-x-hidden">
      {/* Subtle grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#FFFBF7]/80 backdrop-blur-md border-b border-sage-200/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-sage-500 to-sage-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-display text-xl font-semibold text-slate-800">Fairward</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/query" className="text-sm font-medium text-slate-600 hover:text-sage-600 transition-colors">
              Search Prices
            </Link>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-sage-600 transition-colors">
              How It Works
            </a>
            <Link
              href="/query"
              className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white text-sm font-semibold rounded-full transition-all hover:shadow-lg hover:shadow-coral-500/25"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-sage-300/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-coral-300/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-sage-100 rounded-full mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-sage-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-sage-700">Your AI Healthcare Advocate</span>
          </div>

          {/* Main headline */}
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 animate-fade-in-up">
            <span className="text-slate-800">Finally, someone</span>
            <br />
            <span className="bg-gradient-to-r from-sage-600 via-sage-500 to-coral-500 bg-clip-text text-transparent">
              fighting for you
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up animation-delay-100">
            Medical bills are confusing, expensive, and often wrong.
            Fairward helps you see real prices, spot errors, and fight unfair charges.
          </p>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="relative max-w-xl mx-auto animate-fade-in-up animation-delay-200"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-sage-400 via-coral-400 to-sage-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
              <div className="relative flex items-center bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-sage-100">
                <div className="pl-5">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search for a procedure (MRI, knee replacement...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-5 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none text-lg"
                />
                <button
                  type="submit"
                  className="m-2 px-6 py-3 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-sage-500/30 active:scale-[0.98]"
                >
                  Compare Prices
                </button>
              </div>
            </div>
          </form>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-slate-500 animate-fade-in-up animation-delay-300">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sage-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Free to search</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sage-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Real hospital prices</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sage-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No account needed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-sage-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                stat: "5x",
                label: "Price difference",
                description: "The same MRI can cost $400 at one hospital and $4,000 at another just 20 miles away"
              },
              {
                stat: "80%",
                label: "Bills have errors",
                description: "The average large hospital bill contains $1,300 in overcharges and mistakes"
              },
              {
                stat: "#1",
                label: "Cause of bankruptcy",
                description: "Medical bills are the leading cause of personal bankruptcy in America"
              }
            ].map((item, i) => (
              <div
                key={i}
                className="group relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-sage-100/50 hover:border-sage-200"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="absolute top-0 left-8 w-16 h-1 bg-gradient-to-r from-coral-400 to-coral-500 rounded-b-full transform -translate-y-px" />
                <div className="font-display text-5xl font-bold bg-gradient-to-br from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
                  {item.stat}
                </div>
                <div className="text-sage-600 font-semibold mb-3">{item.label}</div>
                <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Changed Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-full mb-6">
            <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-amber-700">A new law changed everything</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-800 mb-6">
            Hospitals must now publish their prices.
            <br />
            <span className="text-sage-600">They just made it impossible to find.</span>
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            Since 2021, federal law requires every hospital to publish their prices online.
            But they&apos;ve buried the data in incompatible formats, broken links, and confusing spreadsheets.
            The information is technically public but practically invisible.
          </p>
          <p className="text-xl font-display font-semibold text-coral-600">
            Fairward makes it accessible.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-slate-800 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-96 h-96 bg-sage-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-coral-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              How Fairward helps you
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              From researching prices to fighting your bill, we&apos;re with you every step of the way
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
                phase: "Before care",
                title: "Know your options",
                description: "Search any procedure. See what every hospital actually charges your insurance. Know when you're being quoted 3x the fair price.",
                color: "sage"
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                phase: "Before you commit",
                title: "Confirm in writing",
                description: "Fairward contacts providers to confirm prices, request cash-pay alternatives, and find cheaper options nearby.",
                color: "amber"
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                phase: "After care",
                title: "Fight unfair bills",
                description: "Upload your bill. We detect errors, identify overcharges, and negotiate with billing departments on your behalf.",
                color: "coral"
              }
            ].map((item, i) => (
              <div
                key={i}
                className="group relative"
              >
                {/* Connector line for larger screens */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-[calc(50%+60px)] w-[calc(100%-60px)] h-px bg-gradient-to-r from-slate-600 to-transparent" />
                )}

                <div className="relative bg-slate-700/50 backdrop-blur rounded-3xl p-8 border border-slate-600/50 hover:border-slate-500/50 transition-all hover:bg-slate-700/70">
                  {/* Step number */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-800 border-2 border-slate-600 rounded-full flex items-center justify-center text-sm font-bold text-slate-400">
                    {i + 1}
                  </div>

                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
                    item.color === 'sage' ? 'bg-sage-500/20 text-sage-400' :
                    item.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-coral-500/20 text-coral-400'
                  }`}>
                    {item.icon}
                  </div>

                  <div className={`text-sm font-medium mb-2 ${
                    item.color === 'sage' ? 'text-sage-400' :
                    item.color === 'amber' ? 'text-amber-400' :
                    'text-coral-400'
                  }`}>
                    {item.phase}
                  </div>
                  <h3 className="font-display text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-sage-500 to-sage-600 rounded-3xl p-10 md:p-14 text-white overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full" />

            <div className="relative text-center">
              <div className="font-display text-6xl md:text-7xl font-bold mb-4">74%</div>
              <p className="text-xl md:text-2xl font-medium mb-6 text-sage-100">
                of people who challenge a medical bill get it reduced or corrected
              </p>
              <p className="text-sage-200 max-w-xl mx-auto">
                The problem isn&apos;t that bills can&apos;t be fought—it&apos;s that most people don&apos;t have the time, knowledge, or energy to fight. That&apos;s where we come in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Works */}
      <section className="py-20 px-6 bg-sage-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-800 mb-6">
                Every bill we fight makes us smarter
              </h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                Every bill we review teaches us which hospitals negotiate, which insurers approve appeals, and what tactics work. This intelligence compounds over time into an advantage no one else has.
              </p>
              <ul className="space-y-4">
                {[
                  "Pattern recognition across thousands of bills",
                  "Real-time database of negotiation outcomes",
                  "AI that learns what arguments actually work"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 bg-sage-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              {/* Visual representation of learning */}
              <div className="relative bg-white rounded-3xl p-8 shadow-xl shadow-sage-200/50 border border-sage-100">
                <div className="space-y-4">
                  {[
                    { hospital: "Memorial General", saved: "$2,340", status: "success" },
                    { hospital: "St. Mary's Medical", saved: "$890", status: "success" },
                    { hospital: "University Health", saved: "$4,120", status: "success" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-sage-50 rounded-xl"
                      style={{ animationDelay: `${i * 150}ms` }}
                    >
                      <div>
                        <div className="font-medium text-slate-800">{item.hospital}</div>
                        <div className="text-sm text-slate-500">Bill reduced</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-bold text-sage-600">{item.saved}</div>
                        <div className="text-xs text-sage-500">saved</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-sage-100 text-center">
                  <div className="text-sm text-slate-500">Learning from every outcome</div>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-sage-400 rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Stop overpaying for healthcare
          </h2>
          <p className="text-xl text-slate-600 mb-10">
            Start with a simple search. See what your procedure should actually cost.
          </p>
          <Link
            href="/query"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white text-lg font-semibold rounded-full transition-all hover:shadow-xl hover:shadow-coral-500/30 active:scale-[0.98] group"
          >
            <span>Search Procedure Prices</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          <p className="mt-8 text-sm text-slate-500">
            Free to search · No account required · Real hospital prices
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-sage-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-sage-500 to-sage-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="font-display font-semibold text-slate-800">Fairward</span>
            </div>

            <p className="text-sm text-slate-500">
              Fairward fights for you.
            </p>

            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-sage-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-sage-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-sage-600 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
