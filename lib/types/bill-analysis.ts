/**
 * Bill Buster - Type definitions for medical bill analysis
 */

export interface BillAnalysis {
  billType: "itemized" | "summary";
  provider: {
    name: string | null;
    address: string | null;
    billingContact: string | null;
  };
  dateOfService: string | null;
  accountNumber: string | null;

  totals: {
    billed: number;
    fairEstimate: number;
    potentialSavings: {
      min: number;
      max: number;
    };
  };

  lineItems: LineItem[];
  issues: Issue[];
  generalTips: string[];
  rawText: string;
}

export interface LineItem {
  id: string;
  description: string;
  code: string | null;
  codeConfidence: "high" | "medium" | "low";
  quantity: number;
  billedAmount: number;
  benchmarkAmount: number | null;
  benchmarkSource: string | null;
  variance: number | null; // percentage above/below benchmark
  flag: "fair" | "high" | "error" | null;
}

export type IssueType =
  | "duplicate"
  | "unbundling"
  | "upcoding"
  | "inflated"
  | "missed_discount";

export interface Issue {
  id: string;
  type: IssueType;
  title: string;
  shortDescription: string;
  fullExplanation: string;
  disputeLanguage: string;
  affectedLineItems: string[]; // line item IDs
  estimatedSavings: number;
  annotation: {
    boundingBox: BoundingBox;
  };
}

export interface BoundingBox {
  x: number; // percentage (0-100) from left
  y: number; // percentage (0-100) from top
  width: number; // percentage
  height: number; // percentage
  page: number; // 0-indexed page number
}

// API request/response types

export interface AnalyzeRequest {
  file: File;
  insurance?: {
    payerName: string;
    planType: string;
  } | null;
}

export interface AnalyzeResponse {
  success: boolean;
  data: BillAnalysis;
  timing: {
    ocr_ms: number;
    parse_ms: number;
    benchmark_ms: number;
    issues_ms: number;
    total_ms: number;
  };
}

export interface ChatRequest {
  messages: ChatMessage[];
  billAnalysis: BillAnalysis;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateCaseRequest {
  analysis: BillAnalysis;
  patientName?: string;
}

export interface GenerateCaseResponse {
  success: boolean;
  document: string; // markdown
}

// Internal processing types

export interface OCRResult {
  text: string;
  pages: PageOCRData[];
}

export interface PageOCRData {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
}

export interface ParsedBill {
  provider: BillAnalysis["provider"];
  dateOfService: string | null;
  accountNumber: string | null;
  lineItems: Omit<LineItem, "benchmarkAmount" | "benchmarkSource" | "variance" | "flag">[];
  totalBilled: number;
  isItemized: boolean;
}

export interface BenchmarkResult {
  code: string;
  description: string;
  lowPrice: number;
  highPrice: number;
  medianPrice: number;
  source: string;
  region: string;
}

// Progress tracking for UI

export type AnalysisStage =
  | "uploading"
  | "reading"
  | "parsing"
  | "checking"
  | "benchmarking"
  | "complete"
  | "error";

export interface AnalysisProgress {
  stage: AnalysisStage;
  percent: number;
  message: string;
}

export const ANALYSIS_STAGES: Record<AnalysisStage, { percent: number; message: string }> = {
  uploading: { percent: 10, message: "Uploading your bill..." },
  reading: { percent: 30, message: "Reading your bill..." },
  parsing: { percent: 50, message: "Parsing line items..." },
  checking: { percent: 70, message: "Checking for errors..." },
  benchmarking: { percent: 85, message: "Finding fair prices..." },
  complete: { percent: 100, message: "Analysis complete" },
  error: { percent: 0, message: "Something went wrong" },
};

// Constants

export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_PAGES = 10;
export const ACCEPTED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
export const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];

// Issue type display info

export const ISSUE_TYPE_INFO: Record<IssueType, { label: string; icon: string }> = {
  duplicate: { label: "Duplicate Charge", icon: "copy" },
  unbundling: { label: "Unbundling", icon: "ungroup" },
  upcoding: { label: "Upcoding", icon: "trending-up" },
  inflated: { label: "Inflated Price", icon: "dollar-sign" },
  missed_discount: { label: "Missed Discount", icon: "percent" },
};

// General negotiation tips (shown when no issues found or always)

export const GENERAL_TIPS = [
  "Request an itemized bill if you don't have one - you have a right to see exactly what you're being charged for.",
  "Ask about uninsured/self-pay discounts - many hospitals offer 20-40% off for cash payments.",
  "Inquire about financial assistance programs - most non-profit hospitals are required to offer charity care.",
  "Request a payment plan to spread costs over time - this is usually interest-free.",
  "Compare prices with other providers in your area using our Price Search tool.",
];
