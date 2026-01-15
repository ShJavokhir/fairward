"use client";

import { cn } from "@/lib/utils";

interface SummaryBarProps {
  totalBilled: number;
  fairEstimate: number;
  potentialSavings: { min: number; max: number };
  issueCount: number;
  onGenerateCase: () => void;
  isGenerating?: boolean;
}

export default function SummaryBar({
  totalBilled,
  fairEstimate,
  potentialSavings,
  issueCount,
  onGenerateCase,
  isGenerating = false,
}: SummaryBarProps) {
  const savingsText =
    potentialSavings.min === potentialSavings.max
      ? `$${potentialSavings.max.toLocaleString()}`
      : `$${potentialSavings.min.toLocaleString()} - $${potentialSavings.max.toLocaleString()}`;

  return (
    <div className="flex-shrink-0 bg-white border-t border-[#E5E7EB] px-6 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">Billed:</span>
            <span className="font-semibold text-[#17270C] tabular-nums">
              ${totalBilled.toLocaleString()}
            </span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-[#E5E7EB]" />
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">Fair estimate:</span>
            <span className="font-semibold text-[#5A9A6B] tabular-nums">
              ~${fairEstimate.toLocaleString()}
            </span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-[#E5E7EB]" />
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">Potential savings:</span>
            <span className="font-semibold text-[#5A9A6B] tabular-nums">
              Up to {savingsText}
            </span>
          </div>
          {issueCount > 0 && (
            <>
              <div className="hidden sm:block w-px h-6 bg-[#E5E7EB]" />
              <div className="flex items-center gap-2">
                <span className="size-2 bg-[#DC2626] rounded-full" />
                <span className="text-[#6B7280]">
                  {issueCount} issue{issueCount > 1 ? "s" : ""} found
                </span>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onGenerateCase}
          disabled={isGenerating}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
            "bg-[#002125] text-white hover:bg-[#012E33]",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {isGenerating ? (
            <>
              <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Generate Case Document</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
