"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ArrowRight, Sparkles, Shield, Phone, DollarSign } from "lucide-react";

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#ECECEC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-1">
            <span className="font-serif text-2xl tracking-tight text-[#002125]">Just</span>
            <span className="font-serif text-2xl tracking-tight text-[#5A9A6B]">Price</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/query" className="text-sm text-[#17270C] hover:text-[#002125] transition-colors">
              Search Prices
            </Link>
            <Link href="/pricing" className="text-sm text-[#002125] font-medium">
              Pricing
            </Link>
          </nav>
          <Link href="/query" className="btn-primary text-sm">
            <span>Get Started</span>
            <span className="btn-arrow">
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function SavingsCalculator() {
  const [billAmount, setBillAmount] = useState(5000);
  const [savingsPercent] = useState(35);

  const estimatedSavings = Math.round(billAmount * (savingsPercent / 100));
  const ourFee = Math.min(Math.round(estimatedSavings * 0.1), 500);
  const yourNetSavings = estimatedSavings - ourFee;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 md:p-8">
      <h3 className="font-serif text-2xl text-[#17270C] mb-6">See Your Potential Savings</h3>

      <div className="space-y-6">
        <div>
          <label className="text-xs uppercase tracking-wider text-[#6B7280] block mb-2">Your Medical Bill</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]">$</span>
            <input
              type="number"
              value={billAmount}
              onChange={(e) => setBillAmount(Number(e.target.value) || 0)}
              className="w-full pl-8 pr-4 py-3 text-lg border border-[#E5E7EB] rounded-xl text-[#17270C] focus:outline-none focus:border-[#002125] focus:ring-2 focus:ring-[#002125]/10 transition-colors"
              min={0}
              step={100}
            />
          </div>
          <input
            type="range"
            min={500}
            max={50000}
            step={100}
            value={billAmount}
            onChange={(e) => setBillAmount(Number(e.target.value))}
            className="w-full mt-3 accent-[#002125] h-2 bg-[#E5E7EB] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#002125] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <div className="flex justify-between text-xs text-[#6B7280] mt-1">
            <span>$500</span>
            <span>$50,000</span>
          </div>
        </div>

        <div className="h-px bg-[#ECECEC]" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[#F2FBEF] rounded-xl">
            <p className="text-xs uppercase tracking-wider text-[#6B7280] mb-1">Typical Savings</p>
            <p className="text-2xl font-medium text-[#5A9A6B] tabular-nums">
              ${estimatedSavings.toLocaleString()}
            </p>
            <p className="text-xs text-[#6B7280] mt-1">~{savingsPercent}% reduction</p>
          </div>

          <div className="p-4 bg-[#F2FBEF] rounded-xl">
            <p className="text-xs uppercase tracking-wider text-[#6B7280] mb-1">Our Fee</p>
            <p className="text-2xl font-medium text-[#17270C] tabular-nums">
              ${ourFee.toLocaleString()}
            </p>
            <p className="text-xs text-[#6B7280] mt-1">10% of savings (max $500)</p>
          </div>

          <div className="p-4 bg-[#5A9A6B]/10 rounded-xl border border-[#5A9A6B]/20">
            <p className="text-xs uppercase tracking-wider text-[#5A9A6B] mb-1">You Keep</p>
            <p className="text-2xl font-medium text-[#5A9A6B] tabular-nums">
              ${yourNetSavings.toLocaleString()}
            </p>
            <p className="text-xs text-[#5A9A6B] mt-1">Your net savings</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQItem({ question, answer, isOpen, onClick }: { question: string; answer: string; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="border-b border-[#ECECEC] last:border-0">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-center justify-between text-left group"
      >
        <span className="font-serif text-lg text-[#17270C] pr-4">{question}</span>
        <ChevronDown className={`w-5 h-5 text-[#6B7280] transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-5' : 'max-h-0'}`}>
        <p className="text-[#6B7280] leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How do you calculate my savings?",
      answer: "Your savings is the difference between your original medical bill and the final negotiated amount. For example, if your bill was $10,000 and we negotiate it down to $6,500, your savings is $3,500. Our fee would be 10% of that savings ($350), and you keep the remaining $3,150."
    },
    {
      question: "What if you can't reduce my bill?",
      answer: "If we're unable to negotiate any reduction on your bill, you pay nothing. Our fee is based entirely on the savings we achieve for you. No savings means no fee — it's that simple."
    },
    {
      question: "Is there a minimum bill amount?",
      answer: "We work with bills of any size, but our service is most valuable for bills over $500. For smaller amounts, the potential savings may not justify the effort, though we're happy to help regardless."
    },
    {
      question: "How long does the negotiation process take?",
      answer: "Most negotiations are completed within 2-4 weeks, though complex cases involving multiple providers or insurance disputes may take longer. We keep you updated throughout the process."
    },
    {
      question: "What types of medical bills do you negotiate?",
      answer: "We negotiate all types of medical bills including hospital stays, surgeries, emergency room visits, imaging (MRI, CT scans), lab work, specialist consultations, and more. We work with both insured and uninsured bills."
    },
    {
      question: "Why is the fee capped at $500?",
      answer: "We cap our fee at $500 because we believe in fair pricing. For very large bills where we might save you tens of thousands of dollars, it wouldn't be fair to charge thousands in fees. The cap ensures you always keep the majority of your savings."
    }
  ];

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 md:p-8">
      <h3 className="font-serif text-2xl text-[#17270C] mb-6">Frequently Asked Questions</h3>
      <div>
        {faqs.map((faq, index) => (
          <FAQItem
            key={index}
            question={faq.question}
            answer={faq.answer}
            isOpen={openIndex === index}
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          />
        ))}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 md:pb-24 bg-[#F2FBEF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs uppercase tracking-wider text-[#6B7280] mb-4 animate-fade-in">Simple, Fair Pricing</p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#17270C] mb-6 animate-slide-up" style={{ letterSpacing: '-0.02em' }}>
              Pay only when we save you money
            </h1>
            <p className="text-lg text-[#6B7280] leading-relaxed animate-slide-up" style={{ animationDelay: '100ms' }}>
              We charge 10% of what we save you, up to a maximum of $500.
              If we don&apos;t reduce your bill, you don&apos;t pay a thing.
            </p>
          </div>
        </div>
      </section>

      {/* Main Pricing Card */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Pricing Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 md:p-12 text-center mb-12 animate-scale-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A9A6B]/10 text-[#5A9A6B] rounded-full text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>Success-Based Pricing</span>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="font-serif text-6xl md:text-7xl text-[#17270C]">10%</span>
                  <span className="text-2xl text-[#6B7280]">of savings</span>
                </div>
                <p className="text-[#6B7280] mt-2">Maximum fee: $500</p>
              </div>

              <div className="h-px bg-[#ECECEC] mb-8" />

              <ul className="space-y-4 text-left max-w-md mx-auto mb-10">
                {[
                  "No upfront costs or hidden fees",
                  "Pay only when we successfully reduce your bill",
                  "Fee capped at $500, no matter how much we save",
                  "Full transparency on all negotiations",
                  "Money-back guarantee if not satisfied"
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#5A9A6B]/20 flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3 text-[#5A9A6B]" />
                    </span>
                    <span className="text-[#17270C]">{item}</span>
                  </li>
                ))}
              </ul>

              <Link href="/query" className="btn-primary text-base inline-flex">
                <span>Start Saving Today</span>
                <span className="btn-arrow">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>

            {/* How It Works */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {[
                {
                  icon: DollarSign,
                  title: "Share Your Bill",
                  description: "Upload or tell us about your medical bill. We'll review it and identify opportunities for savings."
                },
                {
                  icon: Phone,
                  title: "We Negotiate",
                  description: "Our team contacts your healthcare provider and negotiates on your behalf to reduce your charges."
                },
                {
                  icon: Shield,
                  title: "You Save",
                  description: "Once we secure a reduction, you pay just 10% of the savings (max $500). You keep the rest."
                }
              ].map((step, index) => (
                <div key={index} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="w-12 h-12 rounded-full bg-[#F2FBEF] flex items-center justify-center mb-4">
                    <step.icon className="w-6 h-6 text-[#002125]" />
                  </div>
                  <h3 className="font-serif text-xl text-[#17270C] mb-2">{step.title}</h3>
                  <p className="text-[#6B7280] text-sm leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>

            {/* Savings Calculator */}
            <div className="mb-16 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <SavingsCalculator />
            </div>

            {/* Example Scenarios */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 md:p-8 mb-16 animate-slide-up" style={{ animationDelay: '400ms' }}>
              <h3 className="font-serif text-2xl text-[#17270C] mb-6">Real Savings Examples</h3>
              <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[#ECECEC]">
                      <th className="text-left text-xs uppercase tracking-wider text-[#6B7280] pb-3 font-normal">Procedure</th>
                      <th className="text-right text-xs uppercase tracking-wider text-[#6B7280] pb-3 font-normal">Original</th>
                      <th className="text-right text-xs uppercase tracking-wider text-[#6B7280] pb-3 font-normal">Negotiated</th>
                      <th className="text-right text-xs uppercase tracking-wider text-[#6B7280] pb-3 font-normal">Savings</th>
                      <th className="text-right text-xs uppercase tracking-wider text-[#6B7280] pb-3 font-normal">Our Fee</th>
                      <th className="text-right text-xs uppercase tracking-wider text-[#6B7280] pb-3 font-normal">You Keep</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECECEC]">
                    {[
                      { procedure: "MRI Scan", original: 3500, negotiated: 1800 },
                      { procedure: "ER Visit", original: 8200, negotiated: 4500 },
                      { procedure: "Knee Surgery", original: 25000, negotiated: 15000 },
                      { procedure: "Colonoscopy", original: 4800, negotiated: 2400 },
                    ].map((row, index) => {
                      const savings = row.original - row.negotiated;
                      const fee = Math.min(Math.round(savings * 0.1), 500);
                      const netSavings = savings - fee;
                      return (
                        <tr key={index}>
                          <td className="py-4 text-[#17270C]">{row.procedure}</td>
                          <td className="py-4 text-right text-[#6B7280] tabular-nums">${row.original.toLocaleString()}</td>
                          <td className="py-4 text-right text-[#17270C] tabular-nums">${row.negotiated.toLocaleString()}</td>
                          <td className="py-4 text-right text-[#5A9A6B] tabular-nums">${savings.toLocaleString()}</td>
                          <td className="py-4 text-right text-[#6B7280] tabular-nums">${fee.toLocaleString()}</td>
                          <td className="py-4 text-right font-medium text-[#5A9A6B] tabular-nums">${netSavings.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FAQ */}
            <div className="animate-slide-up" style={{ animationDelay: '500ms' }}>
              <FAQ />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-[#002125]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-white mb-4" style={{ letterSpacing: '-0.02em' }}>
            Ready to reduce your medical bills?
          </h2>
          <p className="text-[#CEFDCE]/80 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of patients who have saved money on their healthcare costs.
            Start with a free price comparison.
          </p>
          <Link href="/query" className="inline-flex items-center gap-2 px-6 py-3 bg-[#98FB98] text-[#002125] font-medium rounded-full hover:bg-[#CEFDCE] transition-colors">
            <span>Search Procedure Prices</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[#ECECEC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-1">
              <span className="font-serif text-xl tracking-tight text-[#002125]">Just</span>
              <span className="font-serif text-xl tracking-tight text-[#5A9A6B]">Price</span>
            </Link>
            <p className="text-sm text-[#6B7280]">
              © {new Date().getFullYear()} JustPrice. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
