"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Issue, BoundingBox } from "@/lib/types/bill-analysis";

interface BillViewerProps {
  fileUrl: string;
  fileType: string;
  issues: Issue[];
  onIssueClick?: (issue: Issue) => void;
  highlightedIssueId?: string | null;
}

export default function BillViewer({
  fileUrl,
  fileType,
  issues,
  onIssueClick,
  highlightedIssueId,
}: BillViewerProps) {
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hoveredIssue, setHoveredIssue] = useState<Issue | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isPdf = fileType === "application/pdf";

  // For images, we just display them directly
  // For PDFs, we use an iframe or embed

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.25, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setScale(1);
  }, []);

  const handleAnnotationHover = useCallback(
    (issue: Issue, e: React.MouseEvent) => {
      setHoveredIssue(issue);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        setTooltipPosition({
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top - 10,
        });
      }
    },
    []
  );

  const handleAnnotationLeave = useCallback(() => {
    setHoveredIssue(null);
  }, []);

  // Filter issues for current page
  const pageIssues = issues.filter((issue) => issue.annotation.boundingBox.page === currentPage);

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] rounded-xl overflow-hidden border border-[#E5E7EB]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-[#F2FBEF] rounded-lg transition-colors"
            aria-label="Zoom out"
          >
            <svg className="size-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleZoomReset}
            className="px-3 py-1.5 text-sm text-[#6B7280] hover:bg-[#F2FBEF] rounded-lg transition-colors tabular-nums"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-[#F2FBEF] rounded-lg transition-colors"
            aria-label="Zoom in"
          >
            <svg className="size-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-2 hover:bg-[#F2FBEF] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <svg className="size-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-[#6B7280] tabular-nums">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-2 hover:bg-[#F2FBEF] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <svg className="size-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        <div className="text-sm text-[#6B7280]">
          {pageIssues.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="size-2 bg-[#DC2626] rounded-full" />
              {pageIssues.length} issue{pageIssues.length > 1 ? "s" : ""} on this page
            </span>
          )}
        </div>
      </div>

      {/* Document viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        style={{ minHeight: 0 }}
      >
        <div
          className="relative inline-block min-w-full"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {isPdf ? (
            <iframe
              src={`${fileUrl}#page=${currentPage + 1}`}
              className="w-full h-[800px] border-0"
              title="Bill PDF"
            />
          ) : (
            <img
              src={fileUrl}
              alt="Bill"
              className="max-w-full h-auto"
              onLoad={() => setTotalPages(1)}
            />
          )}

          {/* Annotations overlay */}
          {pageIssues.map((issue) => (
            <div
              key={issue.id}
              className={cn(
                "absolute cursor-pointer transition-all duration-200",
                "border-2 border-[#DC2626] bg-[#DC2626]/10",
                "hover:bg-[#DC2626]/20 hover:border-[#DC2626]",
                highlightedIssueId === issue.id && "ring-4 ring-[#DC2626]/30 bg-[#DC2626]/25"
              )}
              style={{
                left: `${issue.annotation.boundingBox.x}%`,
                top: `${issue.annotation.boundingBox.y}%`,
                width: `${issue.annotation.boundingBox.width}%`,
                height: `${issue.annotation.boundingBox.height}%`,
              }}
              onClick={() => onIssueClick?.(issue)}
              onMouseEnter={(e) => handleAnnotationHover(issue, e)}
              onMouseLeave={handleAnnotationLeave}
              role="button"
              aria-label={`Issue: ${issue.title}`}
            >
              <div className="absolute -top-1 -left-1 size-4 bg-[#DC2626] rounded-full flex items-center justify-center">
                <svg className="size-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {hoveredIssue && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-[#17270C] text-white px-4 py-3 rounded-xl shadow-lg max-w-xs">
              <div className="flex items-center gap-2 mb-1">
                <svg className="size-4 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">{hoveredIssue.title}</span>
              </div>
              <p className="text-sm text-white/80">{hoveredIssue.shortDescription}</p>
              {hoveredIssue.estimatedSavings > 0 && (
                <p className="text-sm text-[#98FB98] mt-1">
                  Potential savings: ${hoveredIssue.estimatedSavings.toLocaleString()}
                </p>
              )}
            </div>
            <div className="w-3 h-3 bg-[#17270C] rotate-45 mx-auto -mt-1.5" />
          </div>
        )}
      </div>
    </div>
  );
}
