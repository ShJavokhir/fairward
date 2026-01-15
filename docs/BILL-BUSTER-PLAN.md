# Bill Buster Implementation Plan

## Phase 1: Foundation (Core Infrastructure)

### 1.1 Type Definitions
**File**: `lib/types/bill-analysis.ts`

```typescript
interface BillAnalysis {
  billType: "itemized" | "summary";
  provider: { name: string | null; address: string | null; billingContact: string | null };
  dateOfService: string | null;
  totals: { billed: number; fairEstimate: number; potentialSavings: { min: number; max: number } };
  lineItems: LineItem[];
  issues: Issue[];
  generalTips: string[];
  rawText: string;
}

interface LineItem {
  id: string;
  description: string;
  code: string | null;
  codeConfidence: "high" | "medium" | "low";
  quantity: number;
  billedAmount: number;
  benchmarkAmount: number | null;
  benchmarkSource: string | null;
  variance: number | null;
  flag: "fair" | "high" | "error" | null;
}

interface Issue {
  id: string;
  type: "duplicate" | "unbundling" | "upcoding" | "inflated" | "missed_discount";
  title: string;
  shortDescription: string;
  fullExplanation: string;
  disputeLanguage: string;
  affectedLineItems: string[];
  estimatedSavings: number;
  annotation: { boundingBox: { x: number; y: number; width: number; height: number; page: number } };
}
```

### 1.2 Bill Analysis Library
**File**: `lib/bill-analysis.ts`

Core functions:
- `extractTextFromPDF(file: File): Promise<{ text: string; pages: PageData[] }>` - Using pdf.js or Fireworks Vision
- `parseBillStructure(text: string): Promise<ParsedBill>` - LLM-based parsing
- `detectIssues(lineItems: LineItem[], rawText: string): Promise<Issue[]>` - Error detection
- `benchmarkPrices(lineItems: LineItem[], region: string): Promise<LineItem[]>` - Web search for fair prices
- `generateCaseDocument(analysis: BillAnalysis): string` - Template-based letter generation

---

## Phase 2: API Routes

### 2.1 Bill Analysis Endpoint
**File**: `app/api/bill-buster/analyze/route.ts`

```
POST /api/bill-buster/analyze
Content-Type: multipart/form-data
Body: { file: File, insurance?: { payerName, planType } }

Response (JSON):
{
  success: boolean,
  data: BillAnalysis,
  timing: { ocr_ms, parse_ms, benchmark_ms, total_ms }
}
```

Processing pipeline:
1. Validate file (type, size <20MB)
2. Extract text via Fireworks Vision model (OCR)
3. Parse bill structure via LLM (provider info, line items, codes)
4. Benchmark each line item via LLM + web search
5. Detect errors (duplicates, unbundling, upcoding, inflated)
6. Calculate totals and potential savings
7. Generate bounding box annotations
8. Return full analysis

### 2.2 Chat Endpoint
**File**: `app/api/bill-buster/chat/route.ts`

```
POST /api/bill-buster/chat
Content-Type: application/json
Body: { messages: Message[], billAnalysis: BillAnalysis }

Response: text/event-stream (streaming)
```

Reuse pattern from existing `/api/chat` with:
- Bill-specific system prompt (from spec section 6.6)
- Web search tool for pricing/regulations
- Context includes parsed bill data

### 2.3 Case Document Endpoint
**File**: `app/api/bill-buster/generate-case/route.ts`

```
POST /api/bill-buster/generate-case
Content-Type: application/json
Body: { analysis: BillAnalysis, patientName?: string }

Response (JSON):
{
  success: boolean,
  document: string,
  format: "text"
}
```

---

## Phase 3: Frontend Components

### 3.1 Page Structure
**File**: `app/bill-buster/page.tsx`

States:
- **Empty**: Upload dropzone + value prop
- **Loading**: Progress bar + skeleton
- **Results**: Two-column layout (bill viewer + issues/chat)
- **Error**: Error message + retry

### 3.2 Bill Viewer Component
**File**: `components/bill-buster/BillViewer.tsx`

Features:
- PDF rendering (react-pdf or pdf.js)
- Zoom in/out controls
- Page navigation
- Red overlay annotations
- Hover tooltips
- Click → scroll to issue

### 3.3 Issues Panel Component
**File**: `components/bill-buster/IssuesPanel.tsx`

Features:
- Issue count header
- Collapsible issue cards
- Hover → highlight annotation
- Click → expand with dispute language
- No issues state with tips

### 3.4 Bill Chat Component
**File**: `components/bill-buster/BillChat.tsx`

Adapt from existing `ChatPanel.tsx`:
- Inline (not floating) layout
- Bill-specific initial message
- Same streaming pattern
- Context injection from analysis

### 3.5 Summary Bar Component
**File**: `components/bill-buster/SummaryBar.tsx`

Features:
- Sticky positioning
- Totals display (billed, fair, savings)
- "Generate Case Document" CTA

### 3.6 Case Document Modal
**File**: `components/bill-buster/CaseDocumentModal.tsx`

Features:
- Modal overlay
- Scrollable document
- Copy to clipboard
- Download as text/PDF
- Patient name placeholder

### 3.7 Upload Dropzone Component
**File**: `components/bill-buster/UploadDropzone.tsx`

Features:
- Drag and drop
- Click to browse
- File type validation
- Size validation
- Preview filename

---

## Phase 4: AI Prompts

### 4.1 Bill Parsing Prompt
Purpose: Extract structured data from OCR text

Key extractions:
- Provider name/address
- Date of service
- Line items (description, code, quantity, amount)
- Totals

### 4.2 Issue Detection Prompt
Purpose: Identify billing errors

Checks:
- Duplicate charges (same code, same date)
- Unbundling (panel tests billed separately)
- Upcoding (higher-level code than warranted)
- Inflated prices (vs regional benchmarks)
- Missed discounts

### 4.3 Benchmark Search Prompt
Purpose: Find fair prices via web search

Query template: `[procedure name] average cost [region] 2025`
Extract: price range, source URL

### 4.4 Chat System Prompt
From spec section 6.6 - medical billing expert persona

---

## Phase 5: Navigation Integration

### 5.1 Add to Navbar
**File**: `app/layout.tsx` or nav component

Add "Lower My Bill" link → `/bill-buster`

---

## Implementation Order

```
Week 1: Foundation
├── 1.1 Type definitions (lib/types/bill-analysis.ts)
├── 1.2 Bill analysis library stubs (lib/bill-analysis.ts)
├── 2.1 Analyze endpoint - basic structure
└── 3.1 Page with empty state + upload

Week 2: Core Analysis
├── 2.1 Analyze endpoint - full OCR + parsing
├── 4.1 Bill parsing prompt tuning
├── 4.2 Issue detection prompt tuning
└── 3.2 Bill viewer with annotations

Week 3: Issues + Chat
├── 3.3 Issues panel
├── 3.4 Bill chat (adapt existing)
├── 2.2 Chat endpoint
└── 4.3 Benchmark search integration

Week 4: Case Document + Polish
├── 3.5 Summary bar
├── 3.6 Case document modal
├── 2.3 Generate case endpoint
├── 5.1 Navbar integration
└── Error handling + edge cases
```

---

## Dependencies

**New packages needed**:
- `react-pdf` or `pdfjs-dist` - PDF rendering
- None else - reuse existing AI SDK, Fireworks, etc.

**Existing to reuse**:
- `@ai-sdk/fireworks` - LLM calls
- `ai` (Vercel AI SDK) - streaming
- Tailwind + design system
- MongoDB connection

---

## Risk Areas

1. **OCR quality** - Fireworks Vision may struggle with poor scans. Mitigation: low-confidence warnings, ask for clearer image.

2. **Bounding box precision** - Mapping OCR positions to PDF coordinates. Mitigation: start with region-level (not line-level) boxes.

3. **Benchmark accuracy** - Web search may return outdated/irrelevant prices. Mitigation: note "estimates" prominently, cite sources.

4. **PDF rendering** - react-pdf has quirks. Mitigation: test with sample bills early, fallback to image conversion.

5. **Large files** - 20MB PDFs may timeout. Mitigation: chunked upload, progress indication, timeout handling.

---

## Decisions

1. **PDF library**: pdfjs-dist with custom canvas overlays for highlighting
2. **Annotation precision**: Region-level boxes for v1
3. **Max pages**: 10 page limit for uploads
4. **OCR/Vision**: Fireworks `qwen3-vl-235b-a22b-instruct` model
5. **Case document**: Markdown rendered on page, copy/download as .md

---

## File Checklist

```
New files to create:
├── lib/types/bill-analysis.ts
├── lib/bill-analysis.ts
├── app/bill-buster/page.tsx
├── app/api/bill-buster/analyze/route.ts
├── app/api/bill-buster/chat/route.ts
├── app/api/bill-buster/generate-case/route.ts
├── components/bill-buster/BillViewer.tsx
├── components/bill-buster/IssuesPanel.tsx
├── components/bill-buster/BillChat.tsx
├── components/bill-buster/SummaryBar.tsx
├── components/bill-buster/CaseDocumentModal.tsx
└── components/bill-buster/UploadDropzone.tsx

Files to modify:
├── app/layout.tsx (add nav link)
└── app/globals.css (add any new animations)
```
