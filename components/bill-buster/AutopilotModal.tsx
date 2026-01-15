"use client";

import { cn } from "@/lib/utils";

interface AutopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName?: string;
  savingsAmount: number;
}

export default function AutopilotModal({
  isOpen,
  onClose,
  providerName,
  savingsAmount,
}: AutopilotModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Preview Badge */}
        <div className="absolute top-4 right-4 z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF3C7] text-[#92400E] text-xs font-medium rounded-full">
            <span className="size-1.5 bg-[#F59E0B] rounded-full animate-pulse" />
            Preview Mode
          </span>
        </div>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-gradient-to-br from-[#002125] to-[#0A4D4D] rounded-xl flex items-center justify-center">
              <svg className="size-5 text-[#98FB98]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#17270C]">
                Autopilot Negotiator
              </h2>
              <p className="text-sm text-[#6B7280]">
                Let AI negotiate on your behalf
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Value prop */}
          <div className="bg-gradient-to-br from-[#F2FBEF] to-[#E8F5E3] rounded-xl p-5 mb-6">
            <div className="flex items-start gap-4">
              <div className="size-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <svg className="size-6 text-[#5A9A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[#17270C] mb-1">
                  {providerName ? `Negotiate with ${providerName}` : "Full-service negotiation"}
                </p>
                <p className="text-sm text-[#5F7A7A]">
                  Our AI agent calls the billing department, disputes charges, and follows up—all without you lifting a finger.
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <h3 className="text-sm font-medium text-[#17270C] mb-3">How Autopilot Works</h3>
          <div className="space-y-3 mb-6">
            {[
              { step: "1", title: "Agent calls billing", desc: "AI calls the provider using your case document" },
              { step: "2", title: "Negotiates on your behalf", desc: "Disputes charges, requests itemized bills, escalates if needed" },
              { step: "3", title: "Tracks progress", desc: "You get updates via text/email as the case progresses" },
              { step: "4", title: "Confirms savings", desc: "Pay only 20% of confirmed savings (success fee)" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="size-6 bg-[#002125] text-white text-xs font-medium rounded-full flex items-center justify-center flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#17270C]">{item.title}</p>
                  <p className="text-xs text-[#6B7280]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="bg-[#F9FAFB] rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#6B7280]">Potential savings</span>
              <span className="text-sm font-medium text-[#17270C] tabular-nums">
                ${savingsAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#6B7280]">Success fee (20%)</span>
              <span className="text-sm font-medium text-[#17270C] tabular-nums">
                ${Math.round(savingsAmount * 0.2).toLocaleString()}
              </span>
            </div>
            <div className="border-t border-[#E5E7EB] mt-3 pt-3">
              <p className="text-xs text-[#6B7280] text-center">
                You only pay if we save you money
              </p>
            </div>
          </div>

          {/* Coming soon notice */}
          <div className="bg-[#F3F4F6] rounded-xl p-4 text-center">
            <div className="size-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <svg className="size-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#17270C] mb-1">Coming Soon</p>
            <p className="text-xs text-[#6B7280] max-w-xs mx-auto">
              Autopilot is currently in development. Join the waitlist to be notified when it launches.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-sm font-medium text-[#6B7280] hover:text-[#17270C] transition-colors rounded-xl border border-[#E5E7EB] hover:bg-[#F9FAFB]"
          >
            Maybe Later
          </button>
          <button
            disabled
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm",
              "bg-[#002125] text-white opacity-50 cursor-not-allowed"
            )}
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Join Waitlist
          </button>
        </div>
      </div>
    </div>
  );
}
