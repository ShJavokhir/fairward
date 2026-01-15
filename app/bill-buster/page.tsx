"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UploadDropzone from "@/components/bill-buster/UploadDropzone";
import BillViewer from "@/components/bill-buster/BillViewer";
import IssuesPanel from "@/components/bill-buster/IssuesPanel";
import BillChat from "@/components/bill-buster/BillChat";
import SummaryBar from "@/components/bill-buster/SummaryBar";
import CaseDocumentModal from "@/components/bill-buster/CaseDocumentModal";
import type { BillAnalysis, AnalysisStage, Issue } from "@/lib/types/bill-analysis";
import { ANALYSIS_STAGES } from "@/lib/types/bill-analysis";
import { buildInitialChatMessage } from "@/lib/bill-analysis-client";

type PageState = "empty" | "loading" | "results" | "error";

function ArrowIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

export default function BillBusterPage() {
  const [pageState, setPageState] = useState<PageState>("empty");
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("uploading");
  const [analysis, setAnalysis] = useState<BillAnalysis | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [caseDocument, setCaseDocument] = useState<string>("");
  const [isGeneratingCase, setIsGeneratingCase] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    setPageState("loading");
    setAnalysisStage("uploading");
    setError(null);

    // Create object URL for preview
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setFileType(file.type);

    // Simulate progress stages
    const stages: AnalysisStage[] = ["reading", "parsing", "checking", "benchmarking"];
    let stageIndex = 0;

    const progressInterval = setInterval(() => {
      if (stageIndex < stages.length) {
        setAnalysisStage(stages[stageIndex]);
        stageIndex++;
      }
    }, 2000);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/bill-buster/analyze", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await response.json();
      setAnalysis(data.data);
      setAnalysisStage("complete");
      setPageState("results");
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setAnalysisStage("error");
      setPageState("error");
    }
  }, []);

  const handleReset = useCallback(() => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    setPageState("empty");
    setAnalysis(null);
    setFileUrl(null);
    setFileType("");
    setError(null);
    setHighlightedIssueId(null);
    setCaseDocument("");
  }, [fileUrl]);

  const handleIssueHover = useCallback((issue: Issue | null) => {
    setHighlightedIssueId(issue?.id ?? null);
  }, []);

  const handleIssueClick = useCallback((issue: Issue) => {
    setHighlightedIssueId(issue.id);
  }, []);

  const handleGenerateCase = useCallback(async () => {
    if (!analysis) return;

    setIsGeneratingCase(true);

    try {
      const response = await fetch("/api/bill-buster/generate-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate case document");
      }

      const data = await response.json();
      setCaseDocument(data.document);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Generate case error:", err);
    } finally {
      setIsGeneratingCase(false);
    }
  }, [analysis]);

  const currentStage = ANALYSIS_STAGES[analysisStage];

  return (
    <div className="min-h-dvh bg-[#F9FAFB] text-[#17270C] selection:bg-[#98FB98] selection:text-[#002125]">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="group">
            <span className="text-2xl font-semibold group-hover:opacity-80 transition-opacity">
              <span className="text-[#17270C]">Just</span>
              <span className="text-[#5A9A6B]">Price</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/query"
              className="text-sm transition-colors font-medium no-underline text-[#6B7280] hover:text-[#17270C]"
            >
              Price Search
            </Link>
            <span className="text-sm font-medium text-[#002125]">
              Bill Buster
            </span>
          </div>

          {pageState === "results" && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#6B7280] hover:text-[#17270C] transition-colors"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload New Bill
            </button>
          )}
        </div>
      </nav>

      {/* Empty State */}
      {pageState === "empty" && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-semibold text-[#17270C] mb-4">
              Fight your bill. <span className="text-[#5A9A6B]">Win.</span>
            </h1>
            <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
              Upload your hospital bill and Bill Buster will find errors, flag overcharges,
              and draft your dispute letter.
            </p>
          </div>

          <div className="bg-[#F2FBEF] rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="size-12 bg-[#5A9A6B] rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">74%</span>
              </div>
              <p className="text-lg text-[#17270C]">
                of people who challenge their bill get it reduced
              </p>
            </div>
          </div>

          <UploadDropzone onFileSelect={handleFileSelect} />
        </main>
      )}

      {/* Loading State */}
      {pageState === "loading" && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-[#17270C] mb-4">
              Analyzing your bill...
            </h2>

            {/* Progress bar */}
            <div className="max-w-md mx-auto mb-6">
              <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#002125] rounded-full transition-all duration-500"
                  style={{ width: `${currentStage.percent}%` }}
                />
              </div>
              <p className="text-sm text-[#6B7280] mt-3">{currentStage.message}</p>
            </div>
          </div>

          {/* Skeleton layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[500px] bg-white rounded-xl border border-[#E5E7EB] animate-pulse" />
            <div className="space-y-4">
              <div className="h-48 bg-white rounded-xl border border-[#E5E7EB] animate-pulse" />
              <div className="h-48 bg-white rounded-xl border border-[#E5E7EB] animate-pulse" />
            </div>
          </div>
        </main>
      )}

      {/* Error State */}
      {pageState === "error" && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center">
            <div className="size-16 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="size-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-[#17270C] mb-4">
              Something went wrong
            </h2>
            <p className="text-[#6B7280] mb-8 max-w-md mx-auto">
              {error || "We couldn't analyze your bill. Please try again with a clearer image."}
            </p>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#002125] text-white rounded-xl font-medium hover:bg-[#012E33] transition-colors"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
          </div>
        </main>
      )}

      {/* Results State */}
      {pageState === "results" && analysis && fileUrl && (
        <>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
              {/* Left: Bill Viewer */}
              <div className="h-full">
                <BillViewer
                  fileUrl={fileUrl}
                  fileType={fileType}
                  issues={analysis.issues}
                  onIssueClick={handleIssueClick}
                  highlightedIssueId={highlightedIssueId}
                />
              </div>

              {/* Right: Issues + Chat */}
              <div className="flex flex-col gap-4 h-full">
                {/* Issues Panel - takes up less space if there are few/no issues */}
                <div className={cn(
                  "bg-white rounded-xl border border-[#E5E7EB] overflow-hidden",
                  analysis.issues.length > 0 ? "flex-1 max-h-[50%]" : "h-auto"
                )}>
                  <IssuesPanel
                    issues={analysis.issues}
                    generalTips={analysis.generalTips}
                    onIssueHover={handleIssueHover}
                    onIssueClick={handleIssueClick}
                  />
                </div>

                {/* Chat - takes remaining space */}
                <div className="flex-1 min-h-[300px]">
                  <BillChat
                    billAnalysis={analysis}
                    initialMessage={buildInitialChatMessage(analysis)}
                  />
                </div>
              </div>
            </div>
          </main>

          {/* Summary Bar */}
          <SummaryBar
            totalBilled={analysis.totals.billed}
            fairEstimate={analysis.totals.fairEstimate}
            potentialSavings={analysis.totals.potentialSavings}
            issueCount={analysis.issues.length}
            onGenerateCase={handleGenerateCase}
            isGenerating={isGeneratingCase}
          />

          {/* Case Document Modal */}
          <CaseDocumentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            document={caseDocument}
            providerName={analysis.provider.name || undefined}
          />
        </>
      )}
    </div>
  );
}
