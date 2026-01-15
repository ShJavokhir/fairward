# Bill Buster: Technical Specifications

**Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Ready for Development

---

## 1. Overview

### 1.1 Purpose

Bill Buster is JustPrice's AI-powered medical bill analysis tool. Users upload their hospital bills, and Bill Buster identifies billing errors, inflated charges, and potential savings—then generates a dispute letter to help them fight back.

### 1.2 Product Context

Bill Buster is one of three core pillars of JustPrice:
- **Price Search** — Find fair prices before care (built)
- **Assistant** — Get quotes from providers (built)
- **Bill Buster** — Reduce bills after care (this PRD)

### 1.3 Target User

Cash-pay and high-deductible patients in the SF Bay Area who have received a medical bill and want to understand if they're being overcharged.

### 1.4 Key Value Proposition

> "74% of people who challenge their medical bill get it reduced. Bill Buster does the hard work so you can be one of them."

---

## 2. User Journey

### 2.1 Entry Point

User clicks **"Lower My Bill"** button in the app's top navigation bar.

### 2.2 Flow Summary
```
[Navbar: "Lower My Bill"]
         │
         ▼
[/bill-buster page loads]
         │
         ▼
[Empty state: Value prop + Upload dropzone]
         │
         ▼
[User uploads PDF]
         │
         ▼
[Loading state: Progress bar + skeleton]
         │
         ▼
[Analysis complete: Annotated bill + Issues + Chat]
         │
         ▼
[User explores issues, asks questions in chat]
         │
         ▼
[User clicks "Generate Case Document"]
         │
         ▼
[Modal: Case document with copy/download options]
```

---

## 3. Page Structure

### 3.1 Route

`/bill-buster`

### 3.2 Layout

Two-column layout once bill is uploaded:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  JustPrice          [Price Search]  [Assistant]  [Lower My Bill]   Nav  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────┐  ┌───────────────────────────────┐ │
│  │                                 │  │  Issues Found (3)             │ │
│  │                                 │  │  ┌───────────────────────────┐│ │
│  │    [Annotated Bill PDF]         │  │  │ ⚠ Duplicate charge: $450 ││ │
│  │                                 │  │  └───────────────────────────┘│ │
│  │    ┌─────────────────┐          │  │  ┌───────────────────────────┐│ │
│  │    │ Red overlay box │          │  │  │ ⚠ Inflated: 180% above   ││ │
│  │    └─────────────────┘          │  │  └───────────────────────────┘│ │
│  │                                 │  │  ┌───────────────────────────┐│ │
│  │    ┌─────────────────┐          │  │  │ ⚠ Unbundling detected    ││ │
│  │    │ Red overlay box │          │  │  └───────────────────────────┘│ │
│  │                                 │  ├───────────────────────────────┤ │
│  │                                 │  │  Chat with Bill Buster        │ │
│  │                                 │  │  ─────────────────────────────│ │
│  │                                 │  │  Agent: I found 3 issues...   │ │
│  │                                 │  │                               │ │
│  │                                 │  │  User: What's unbundling?     │ │
│  │                                 │  │                               │ │
│  │                                 │  │  Agent: Unbundling is when... │ │
│  │                                 │  │                               │ │
│  │                                 │  │  ┌───────────────────────────┐│ │
│  │                                 │  │  │ Ask a question...         ││ │
│  │                                 │  │  └───────────────────────────┘│ │
│  └─────────────────────────────────┘  └───────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Summary: $4,200 billed │ ~$2,800 fair │ Up to $1,400 savings        ││
│  │                                        [Generate Case Document]     ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Responsive Behavior

- Desktop (≥1024px): Two-column layout as shown
- Tablet/Mobile (<1024px): Stacked single column (bill on top, issues + chat below)

---

## 4. Page States

### 4.1 Empty State (Before Upload)

Displayed when user first lands on `/bill-buster`.

**Content:**
- Headline: "Fight your bill. Win."
- Subhead: Explain what Bill Buster does in 2-3 sentences
- Key stats: "74% of people who challenge their bill get it reduced"
- Upload dropzone: Drag-and-drop or click to browse
- Note below dropzone: "Itemized bills work best. Don't have one? We'll do what we can."
- Accepted formats: PDF, PNG, JPG

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                        Fight your bill. Win.                            │
│                                                                         │
│         Upload your hospital bill and Bill Buster will find             │
│         errors, flag overcharges, and draft your dispute letter.        │
│                                                                         │
│         74% of people who challenge their bill get it reduced.          │
│                                                                         │
│         ┌───────────────────────────────────────────────────┐           │
│         │                                                   │           │
│         │       📄 Drag and drop your bill here             │           │
│         │          or click to browse                       │           │
│         │                                                   │           │
│         │          PDF, PNG, or JPG                         │           │
│         │                                                   │           │
│         └───────────────────────────────────────────────────┘           │
│                                                                         │
│         Itemized bills work best. Don't have one? We'll do              │
│         what we can with what you've got.                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Loading State (Analysis in Progress)

Displayed immediately after user uploads a file.

**Components:**
- Progress bar showing analysis stages
- Skeleton components for the two-column layout
- Status text that updates as processing progresses

**Progress stages:**
1. "Reading your bill..." (OCR)
2. "Parsing line items..." (Extraction)
3. "Checking for errors..." (Analysis)
4. "Finding fair prices..." (Benchmarking)
5. "Preparing your results..." (Final)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                     Analyzing your bill...                              │
│                                                                         │
│         ████████████████████░░░░░░░░░░  60%                            │
│                                                                         │
│         Checking for errors...                                          │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌───────────────────────────────┐ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │        [Skeleton]               │  │        [Skeleton]             │ │
│  └─────────────────────────────────┘  └───────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Results State (Analysis Complete)

Displayed once analysis is finished. Full two-column layout with:
- Annotated bill viewer (left)
- Issues panel + chat (right, stacked)
- Summary bar (bottom)

### 4.4 No Issues Found State

If Bill Buster detects no obvious errors or overcharges:

**Issues panel shows:**
- "No obvious issues found"
- General negotiation tips as numbered list:
  1. Request an itemized bill if you don't have one
  2. Ask about uninsured/self-pay discounts
  3. Inquire about financial assistance programs
  4. Request a payment plan to spread costs

**Chat still available** for questions.

**"Generate Case Document" button** still visible, generates a general negotiation letter.

---

## 5. Component Specifications

### 5.1 Bill Viewer (Left Panel)

**Purpose:** Display the uploaded bill with visual annotations highlighting problem areas.

**Functionality:**
- Render PDF or image at readable scale
- Overlay semi-transparent red boxes on flagged regions
- Support zoom in/out (buttons or scroll)
- Support pan/scroll for multi-page documents
- Page navigation for multi-page PDFs

**Annotations:**
- Red semi-transparent overlay boxes (similar to reference images)
- Each box corresponds to one detected issue
- Boxes should have subtle border for visibility on light backgrounds

**Interaction:**
- **Hover:** Show tooltip with short explanation (1-2 sentences)
- **Click:** Scroll corresponding issue into view in Issues panel, highlight it briefly

**Tooltip format:**
```
┌─────────────────────────────────────┐
│ ⚠ Duplicate Charge                  │
│ This item appears twice on your     │
│ bill. Potential savings: $450       │
└─────────────────────────────────────┘
```

### 5.2 Issues Panel (Right Top)

**Purpose:** List all detected issues in scannable format.

**Header:**
- "Issues Found (N)" or "No Issues Found"
- Count badge

**Issue cards:**
Each issue displays as a card with:
- Warning icon (⚠)
- Issue type as title (e.g., "Duplicate Charge", "Inflated Price", "Unbundling")
- One-line description
- Potential savings amount (if calculable)

**Layout:**
```
┌─────────────────────────────────────────┐
│ Issues Found (3)                        │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ ⚠ Duplicate Charge         -$450   │ │
│ │ "Lab Panel" billed twice            │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠ Inflated Price           -$680   │ │
│ │ MRI charged 180% above average      │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠ Unbundling               -$270   │ │
│ │ Panel tests billed separately       │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Interaction:**
- **Hover:** Highlight corresponding annotation on bill
- **Click:** Expand card to show full explanation + dispute language

**Expanded card:**
```
┌─────────────────────────────────────────┐
│ ⚠ Duplicate Charge             -$450   │
│ "Comprehensive Metabolic Panel"        │
│ billed twice on same date              │
├─────────────────────────────────────────┤
│ This charge appears on lines 4 and 12  │
│ of your bill for the same date of      │
│ service. You should only be billed     │
│ once for this test.                    │
│                                        │
│ What to say:                           │
│ "I see the Comprehensive Metabolic     │
│ Panel (CPT 80053) was billed twice on  │
│ [date]. Please remove the duplicate."  │
└─────────────────────────────────────────┘
```

### 5.3 Chat Interface (Right Bottom)

**Purpose:** Allow users to ask follow-up questions about their bill and get explanations.

**Initial message:**
When analysis completes, chat shows an initial message summarizing findings:
> "I found 3 potential issues with your bill totaling up to $1,400 in possible savings. The biggest issue is an MRI charge that's 180% above the typical price in your area. Click any issue above to learn more, or ask me a question."

**Input:**
- Text input field with placeholder: "Ask a question about your bill..."
- Send button (or Enter to submit)

**Message display:**
- Agent messages: Left-aligned, streamed in using AI SDK Streamdown
- User messages: Right-aligned
- Timestamps optional for demo

**Capabilities:**
- Answer questions about the bill
- Explain medical billing terminology
- Provide context on detected issues
- Suggest questions to ask the billing department
- Web search for additional pricing benchmarks or regulations

**Streaming:**
- Use AI SDK's `useChat` hook
- Stream responses using Streamdown component
- Show typing indicator while generating

### 5.4 Summary Bar (Bottom)

**Purpose:** Show at-a-glance summary and primary CTA.

**Content:**
- Total billed amount
- Estimated fair price
- Potential savings range
- "Generate Case Document" button (primary CTA)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  $4,200 billed  │  ~$2,800 fair estimate  │  Up to $1,400 savings      │
│                                                   [Generate Case Document] │
└─────────────────────────────────────────────────────────────────────────┘
```

**Sticky behavior:** Summary bar should remain visible when scrolling.

### 5.5 Case Document Modal

**Purpose:** Display generated dispute letter for user to copy or download.

**Trigger:** User clicks "Generate Case Document" button.

**Modal content:**
- Header: "Your Case Document"
- Subheader: "Send this to the billing department at [Provider Name]"
- Document body (scrollable)
- Action buttons: "Copy to Clipboard", "Download as PDF"
- Close button (X)

**Document structure:**
```
[Date]

[Provider Billing Department]
[Address if available]

RE: Dispute of charges - Account #[if found on bill]
Date of Service: [Date from bill]
Patient: [PATIENT NAME]

Dear Billing Department,

I am writing to dispute charges on my recent bill dated [date]. 
After reviewing the itemized statement, I have identified the 
following issues:

1. DUPLICATE CHARGE - $450
   The Comprehensive Metabolic Panel (CPT 80053) appears twice 
   on lines 4 and 12 for the same date of service. I request 
   removal of the duplicate charge.

2. INFLATED PRICING - $680
   The MRI of the lower back (CPT 72148) was billed at $1,800. 
   According to regional pricing data, the typical cost for this 
   procedure in the San Francisco Bay Area is $600-$900. I request 
   an adjustment to a fair market rate.

3. UNBUNDLING - $270
   Individual tests that should be billed as part of a panel 
   were charged separately. Specifically, [details]. This appears 
   to violate standard billing practices.

Based on the above, I am requesting an adjusted bill reflecting 
these corrections. The total disputed amount is $1,400.

Please respond within 30 days. I am prepared to escalate this 
matter to [state agency] if these issues are not addressed.

Sincerely,
[PATIENT NAME]
[Contact information]
```

**Placeholders:**
- `[PATIENT NAME]` — User fills in
- `[Date]` — Auto-filled with current date
- Provider info — Extracted from bill if possible

---

## 6. Technical Architecture

### 6.1 Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| AI SDK | Vercel AI SDK |
| LLM Provider | Fireworks AI |
| OCR | Fireworks AI (vLLM model) |
| Streaming | AI SDK Streamdown |
| State Management | React state (ephemeral) |
| Styling | Project-level design system |

### 6.2 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/bill-buster/analyze` | POST | Upload bill, run full analysis |
| `/api/bill-buster/chat` | POST | Handle chat messages (streaming) |
| `/api/bill-buster/generate-case` | POST | Generate case document |

### 6.3 Data Flow
```
[User uploads PDF]
        │
        ▼
[/api/bill-buster/analyze]
        │
        ├─► [Fireworks Vision Model: OCR]
        │           │
        │           ▼
        │   [Extracted text + spatial data]
        │
        ├─► [Fireworks LLM: Parse bill structure]
        │           │
        │           ▼
        │   [Structured line items, codes, amounts]
        │
        ├─► [Fireworks LLM + Web Search: Benchmark prices]
        │           │
        │           ▼
        │   [Fair price estimates per line item]
        │
        ├─► [Fireworks LLM: Detect errors]
        │           │
        │           ▼
        │   [Issues with types, locations, savings]
        │
        └─► [Response: Full analysis object]
                    │
                    ▼
        [Client renders annotated bill + issues + chat]
```

### 6.4 Analysis Response Schema
```typescript
interface BillAnalysis {
  billType: "itemized" | "summary";
  provider: {
    name: string | null;
    address: string | null;
    billingContact: string | null;
  };
  dateOfService: string | null;
  
  totals: {
    billed: number;
    fairEstimate: number;
    potentialSavings: {
      min: number;
      max: number;
    };
  };
  
  lineItems: Array<{
    id: string;
    description: string;
    code: string | null;
    codeConfidence: "high" | "medium" | "low";
    quantity: number;
    billedAmount: number;
    benchmarkAmount: number | null;
    benchmarkSource: string | null;
    variance: number | null; // percentage
    flag: "fair" | "high" | "error" | null;
  }>;
  
  issues: Array<{
    id: string;
    type: "duplicate" | "unbundling" | "upcoding" | "inflated" | "missed_discount";
    title: string;
    shortDescription: string;
    fullExplanation: string;
    disputeLanguage: string;
    affectedLineItems: string[]; // line item IDs
    estimatedSavings: number;
    annotation: {
      boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
        page: number;
      };
    };
  }>;
  
  generalTips: string[]; // always populated
  
  rawText: string; // OCR output for reference
}
```

### 6.5 Chat Implementation

Use Vercel AI SDK's `useChat` hook:
```typescript
const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: '/api/bill-buster/chat',
  body: {
    billAnalysis: analysis, // pass analysis context
  },
});
```

Chat API route uses streaming:
```typescript
import { streamText } from 'ai';
import { fireworks } from '@ai-sdk/fireworks';

export async function POST(req: Request) {
  const { messages, billAnalysis } = await req.json();
  
  const result = await streamText({
    model: fireworks('accounts/fireworks/models/llama-v3p1-70b-instruct'),
    system: buildSystemPrompt(billAnalysis),
    messages,
    tools: {
      webSearch: { /* web search tool config */ }
    }
  });
  
  return result.toDataStreamResponse();
}
```

### 6.6 System Prompt (Chat)
```
You are Bill Buster, a medical billing expert helping patients understand and dispute their hospital bills.

You have access to the user's bill analysis:
- Provider: {provider.name}
- Total billed: ${totals.billed}
- Issues found: {issues.length}
- Line items: {lineItems}

Your role:
1. Answer questions about the bill in plain, simple language
2. Explain medical billing terms (CPT codes, unbundling, upcoding, etc.)
3. Help the user understand why charges may be unfair
4. Suggest specific questions to ask the billing department
5. Provide encouragement—most people who dispute their bills get them reduced

Guidelines:
- Use simple language. Avoid jargon. The user may not be tech-savvy.
- Be supportive and empowering, not alarmist.
- When citing prices or benchmarks, note these are estimates.
- If you don't know something, say so and suggest the user ask the billing department.
- You can use web search to find current pricing benchmarks or billing regulations.

Do not:
- Provide legal advice
- Guarantee specific savings
- Make claims about what the hospital "must" do (use "should" or "typically")
```

---

## 7. Error Handling

### 7.1 Upload Errors

| Error | User Message | Action |
|-------|--------------|--------|
| File too large (>20MB) | "This file is too large. Please upload a file under 20MB." | Show error, keep dropzone |
| Invalid file type | "Please upload a PDF, PNG, or JPG file." | Show error, keep dropzone |
| Upload failed | "Something went wrong. Please try again." | Show retry button |

### 7.2 Analysis Errors

| Error | User Message | Action |
|-------|--------------|--------|
| OCR failed | "We couldn't read this file. Please upload a clearer image." | Return to upload state |
| OCR low quality | "Some parts of your bill were hard to read. Results may be incomplete." | Show warning banner, continue with partial results |
| Bill not parseable | "This doesn't look like a medical bill. Please upload a hospital or medical bill." | Return to upload state |
| Analysis timeout | "Analysis is taking longer than expected. Please try again." | Show retry button |

### 7.3 Chat Errors

| Error | User Message | Action |
|-------|--------------|--------|
| Message failed | "Couldn't send message. Please try again." | Show retry on message |
| Stream interrupted | "Connection lost. Your previous messages are saved." | Auto-retry or show reconnect |

### 7.4 Case Document Errors

| Error | User Message | Action |
|-------|--------------|--------|
| Generation failed | "Couldn't generate your case document. Please try again." | Show retry in modal |
| Copy failed | "Couldn't copy to clipboard. Please select and copy manually." | Keep modal open |

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target |
|--------|--------|
| Time to first byte (page load) | <500ms |
| Analysis completion (typical bill) | <30 seconds |
| Chat response start (streaming) | <1 second |
| Case document generation | <10 seconds |

### 8.2 Accessibility

- All interactive elements keyboard accessible
- Proper ARIA labels on buttons and regions
- Color contrast meets WCAG AA
- Screen reader support for issue announcements
- Focus management when modal opens/closes

### 8.3 Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile Safari and Chrome on iOS/Android

---

## 9. Future Enhancements (Out of Scope)

1. **Automated sending** — Send dispute letters directly via email/fax
2. **Outcome tracking** — User reports results, feeds data flywheel
3. **Multi-bill support** — Analyze multiple bills in one session
4. **Bill history** — Save and revisit past analyses (requires auth)
5. **Provider-specific intelligence** — "This hospital typically negotiates 30% discounts"
6. **Insurance claim integration** — Fight denials, not just bills

---

## 10. Open Questions

1. **PDF rendering library** — Recommend react-pdf or PDF.js?
2. **Annotation precision** — How precise do bounding boxes need to be? Line-level or region-level?
3. **Maximum pages** — Should we limit bill length for demo (e.g., 10 pages max)?
4. **Copy formatting** — Plain text or attempt to preserve formatting when copying case document?

---

## 11. Success Metrics (Post-Launch)

| Metric | Definition |
|--------|------------|
| Upload completion rate | % of users who land on page and complete upload |
| Analysis completion rate | % of uploads that complete analysis successfully |
| Chat engagement | % of users who send at least one chat message |
| Case document generation | % of users who generate case document |
| Copy/download rate | % of users who copy or download case document |

---

## Appendix A: Reference Materials

Bill Buster's analysis should be informed by established medical billing guides. The following resources should be seeded into the agent's knowledge base:

- CMS guidelines on bundled services (NCCI edits)
- No Surprises Act patient rights
- State-specific billing regulations (California for SF Bay Area)
- Common billing error patterns
- Fair price benchmarking methodology

Web pages to prioritise in your knowledge base:
- https://www.threads.com/@nthmonkey/post/DQVdAD1gHhw
- https://news.ycombinator.com/item?id=45734582
- https://altumed.com/blog/the-ultimate-guide-to-medical-bill-negotiation-good-practice-approaches-and-cases/
- https://examples.tely.ai/caring-strategies-to-negotiate-medical-bills-a-step-by-step-guide-for-patients/
- https://stateline.org/2025/11/20/patients-deploy-bots-to-battle-health-insurers-that-deny-care/
- https://natesnewsletter.substack.com/p/how-a-family-used-ai-to-cut-a-195k
- https://www.tomshardware.com/tech-industry/artificial-intelligence/grieving-family-uses-ai-chatbot-to-cut-hospital-bill-from-usd195-000-to-usd33-000-family-says-claude-highlighted-duplicative-charges-improper-coding-and-other-violations