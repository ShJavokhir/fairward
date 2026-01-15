"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CaseDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: string;
  providerName?: string;
}

export default function CaseDocumentModal({
  isOpen,
  onClose,
  document,
  providerName,
}: CaseDocumentModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(document);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [document]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([document], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `dispute-letter-${new Date().toISOString().split("T")[0]}.md`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [document]);

  if (!isOpen) return null;

  // Simple markdown renderer for display
  const renderMarkdown = (md: string) => {
    return md
      .split("\n")
      .map((line, i) => {
        // Headers
        if (line.startsWith("# ")) {
          return (
            <h1 key={i} className="text-2xl font-bold text-[#17270C] mb-4 mt-6 first:mt-0">
              {line.slice(2)}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="text-xl font-semibold text-[#17270C] mb-3 mt-5">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={i} className="text-lg font-medium text-[#17270C] mb-2 mt-4">
              {line.slice(4)}
            </h3>
          );
        }
        // Horizontal rule
        if (line === "---") {
          return <hr key={i} className="my-4 border-[#E5E7EB]" />;
        }
        // Bold text
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="font-semibold text-[#17270C] mb-2">
              {line.slice(2, -2)}
            </p>
          );
        }
        // Table rows
        if (line.startsWith("|")) {
          const cells = line.split("|").filter(Boolean).map((c) => c.trim());
          if (line.includes("---")) {
            return null; // Skip separator row
          }
          return (
            <div key={i} className="flex border-b border-[#E5E7EB] py-2">
              {cells.map((cell, j) => (
                <div key={j} className={cn("flex-1", j === 1 && "text-right tabular-nums")}>
                  {cell}
                </div>
              ))}
            </div>
          );
        }
        // Empty line
        if (!line.trim()) {
          return <div key={i} className="h-2" />;
        }
        // Regular paragraph - handle inline formatting
        const formatted = line
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>");
        return (
          <p
            key={i}
            className="text-[#17270C] mb-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        );
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-xl font-semibold text-[#17270C]">Your Case Document</h2>
            {providerName && (
              <p className="text-sm text-[#6B7280] mt-0.5">
                Send this to the billing department at {providerName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F2FBEF] rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="size-6 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Document content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F9FAFB]">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 shadow-sm">
            {renderMarkdown(document)}
          </div>
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E7EB] bg-white">
          <p className="text-sm text-[#6B7280]">
            Remember to fill in [YOUR NAME] and contact details
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
                "border border-[#E5E7EB] bg-white hover:bg-[#F2FBEF]",
                copySuccess && "bg-[#5A9A6B] text-white border-[#5A9A6B] hover:bg-[#5A9A6B]"
              )}
            >
              {copySuccess ? (
                <>
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg className="size-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all bg-[#002125] text-white hover:bg-[#012E33]"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download .md</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
