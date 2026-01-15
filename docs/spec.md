# JustPrice: Technical Specifications

**Version:** 1.0 (Live Demo)
**Last Updated:** January 2026

---

## 1. Overview

### 1.1 Purpose

JustPrice is a multi-agent system that helps cash-pay and high-deductible patients understand healthcare pricing, obtain quotes from providers, and analyze medical bills for savings. This document defines the technical specifications for the live demo.

### 1.2 Demo Scope

**In scope:**
- Price discovery for 70 most common CMS-defined shoppable services
- Provider quote requests via email (user-sent) and phone (AI voice agent)
- Bill analysis with annotated PDF viewer and conversational chat
- Case document generation for bill disputes
- SF Bay Area providers only

**Out of scope:**
- User authentication and accounts
- Automated email sending (user copies and sends manually)
- Automated letter sending (user sends dispute letters manually)
- Regions outside SF Bay Area

### 1.3 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js, TypeScript |
| Backend | Next.js API Routes |
| Database | MongoDB Atlas |
| LLM Provider | Fireworks |
| Agent Framework | Vercel AI SDK |
| Voice Agent | Vapi |
| Voice Model | ElevenLabs |
| Deployment | Vercel |

---

## 2. System Architecture

### 2.1 Multi-Agent Design

Three specialized agents, each triggered by user action:
```
┌──────────────────────────────────────────────────────────────────┐
│                          User Actions                            │
└──────────────────────────────────────────────────────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Price Search   │  │    Assistant    │  │   Bill Buster   │
│     Agent       │  │     Agent       │  │     Agent       │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  MongoDB Atlas  │
                    │                 │
                    │ Shared Context: │
                    │ • Pricing data  │
                    │ • Providers     │
                    │ • Procedures    │
                    │ • Sessions      │
                    │ • Call logs     │
                    └─────────────────┘
```

### 2.2 Agent Design Principles

1. **Single responsibility:** Each agent does one thing well
2. **User-triggered:** No orchestrator; agents run when user takes action
3. **Shared context:** Agents communicate through MongoDB, not direct calls
4. **Human-in-the-loop:** User approves before any external contact; user sends all written communications
5. **Stateless execution:** Agents read inputs, produce outputs, maintain no internal state

### 2.3 Data Assumptions

- Pricing data from hospital MRFs is already ingested and queryable
- 70 most common CMS shoppable services are seeded in the database
- SF Bay Area providers (~50-100 facilities) are seeded with name, address, website, phone

---

## 3. Price Search Agent

### 3.1 Purpose

Find and compare prices for a medical procedure across SF Bay Area providers, personalized to the user's insurance or cash-pay status.

### 3.2 Trigger

User submits a procedure search with location and insurance info.

### 3.3 Inputs

| Field | Required | Description |
|-------|----------|-------------|
| procedureQuery | Yes | Procedure name, description, or CPT/HCPCS code |
| zipCode | Yes | User's ZIP code |
| insurance | Yes | `{payerName, planType}` or null for cash |

### 3.4 Processing Steps

1. **Procedure Resolution**
   - If user enters CPT/HCPCS code, validate against procedures database
   - If user enters natural language, use LLM to match to closest procedure(s)
   - If ambiguous, return top 3 matches for user to select

2. **Provider Discovery**
   - Query providers within 25 miles of user's ZIP code
   - Filter to providers that perform this procedure

3. **Price Lookup**
   - For each provider, query pricing database for the resolved procedure
   - If insured: find negotiated rate for their payer + plan type
   - If cash: return cash/self-pay price
   - Include min/max across all payers for context

4. **Comparison Calculation**
   - Calculate median price across all results
   - For each provider, compute percentage vs. median
   - Flag providers charging >50% above median

5. **Summary Generation**
   - Use LLM to generate plain-language summary
   - Highlight lowest-cost options

### 3.5 Outputs

| Field | Description |
|-------|-------------|
| procedureCode | Resolved CPT/HCPCS code |
| procedureDescription | Plain language description |
| results | Array of providers with prices, distance, comparison to median |
| summary | Median price, min, max, provider count |

### 3.6 Error Handling

| Condition | Behavior |
|-----------|----------|
| Procedure not found | Return search suggestions from LLM |
| No providers in radius | Expand radius incrementally up to 50 miles |
| No pricing data for provider | Include provider with "Price not available" flag |
| No pricing for user's insurance | Fall back to cash price, note the fallback |

---

## 4. Assistant Agent

### 4.1 Purpose

Help users contact healthcare providers to request Good Faith Estimates, confirm pricing, check availability, and ask about payment plans—via email draft or AI-powered phone call.

### 4.2 Trigger

User selects a provider from Price Search results and requests a quote.

### 4.3 Inputs

| Field | Required | Description |
|-------|----------|-------------|
| procedureName | Yes | Plain language name |
| cptCode | Yes | CPT/HCPCS code |
| providerName | Yes | Facility name |
| providerAddress | Yes | Full street address |
| providerWebsite | Yes | Provider's website URL |
| providerPhone | Yes | Main phone number |
| insurance | Yes | `{payerName, planType}` or null for cash |
| contactMethod | Yes | "email" or "phone" |

### 4.4 Processing Steps (Email Path)

1. **Contact Discovery**
   - Search web for provider's billing/pricing contact email
   - Browse provider website if needed
   - Priority: billing email → price transparency email → contact form → phone fallback
   - Verify email domain matches provider website
   - Note source where contact was found

2. **Draft Generation**
   - Generate Good Faith Estimate request email
   - Reference the No Surprises Act
   - Include procedure name and CPT code
   - Personalize to insurance status (insured vs. self-pay)
   - Include placeholder for patient name: `[PATIENT NAME]`

### 4.5 Processing Steps (Phone Path)

1. **Call Initiation**
   - Initiate outbound call via Vapi voice agent
   - Use ElevenLabs voice model for natural speech
   - Call provider's billing or scheduling number

2. **Conversation Flow**
   - Introduce as calling on behalf of patient
   - Request Good Faith Estimate for specified procedure and CPT code
   - Confirm price and what's included
   - Ask about appointment availability
   - Inquire about payment plans or cash discounts
   - Thank and end call

3. **Data Capture**
   - Transcribe full call
   - Extract and write to MongoDB:
     - Confirmed price estimate
     - Appointment availability
     - Payment plan options
     - Any additional notes
   - Store call recording reference

### 4.6 Outputs (Email Path)

| Field | Description |
|-------|-------------|
| contactMethod | "email" or "contact_form" |
| contactValue | Email address or form URL |
| contactSource | URL where contact info was found |
| draft.subject | Email subject line |
| draft.body | Email body text |
| reasoning | Brief explanation of how contact was discovered |

### 4.7 Outputs (Phone Path)

| Field | Description |
|-------|-------------|
| callId | Unique identifier for the call |
| callStatus | "completed", "no_answer", "voicemail", "failed" |
| callDuration | Length of call in seconds |
| transcript | Full call transcript |
| extractedData.priceEstimate | Confirmed price if obtained |
| extractedData.availability | Appointment availability info |
| extractedData.paymentPlans | Payment plan options mentioned |
| extractedData.notes | Any other relevant information |
| recordingUrl | Reference to stored call recording |

### 4.8 Error Handling

| Condition | Behavior |
|-----------|----------|
| No email found | Return contact form URL or suggest phone call |
| Website unreachable | Use web search results only, note limitation |
| Multiple possible contacts | Return most specific (billing > general) |
| Phone call not answered | Log attempt, offer to retry or switch to email |
| Voicemail reached | Leave brief message, log outcome |
| Call quality issues | Note in transcript, offer retry |

---

## 5. Bill Buster Agent

### 5.1 Purpose

Analyze uploaded medical bills to detect errors, identify overcharges, flag problem areas visually, answer user questions, and generate a case document for disputing charges.

### 5.2 Trigger

User uploads a medical bill.

### 5.3 Inputs

| Field | Required | Description |
|-------|----------|-------------|
| billFile | Yes | PDF or image (PNG, JPG) |
| insurance | Yes | `{payerName, planType}` or null for cash |

### 5.4 Processing Steps

1. **Document Processing**
   - Extract text from PDF or image via OCR
   - Store raw text for reference
   - Preserve spatial information for annotation positioning

2. **Bill Classification**
   - Determine if bill is itemized or summary-only
   - If summary-only: flag limitation, continue with available data

3. **Bill Parsing**
   - Use LLM to extract structured data:
     - Provider name and address
     - Billing department contact info (if present)
     - Date of service
     - Line items (description, code, quantity, price)
     - Totals, adjustments, patient responsibility

4. **Code Resolution**
   - For each line item, identify CPT/HCPCS code
   - If only description available, use LLM to infer likely code
   - Flag low-confidence matches

5. **Fair Price Benchmarking**
   - For each resolved code, use LLM with web search to find regional benchmarks
   - Query: "[procedure name] average cost [city/region]"
   - Compare billed amount to benchmark
   - Calculate variance percentage
   - Flag charges significantly above benchmark (>50% over)

6. **Error Detection**
   - **Duplicate charges:** Same code billed multiple times for single service
   - **Unbundling:** Services that should be bundled billed separately (e.g., Comprehensive Metabolic Panel billed as individual tests)
   - **Upcoding:** Higher-cost code used when lower-cost code applies based on documentation
   - **Inflated charges:** Prices significantly above regional benchmarks
   - **Missed discounts:** Uninsured discount not applied, financial assistance not offered

7. **Annotation Generation**
   - For each flagged issue, generate:
     - Bounding box coordinates on original document
     - Issue type (error, overcharge, potential savings)
     - Brief description (shown on hover)
     - Detailed explanation (shown in panel)

8. **Savings Calculation**
   - Sum potential savings from correcting errors
   - Sum potential savings from negotiating inflated charges to benchmark
   - Calculate total potential savings range (conservative to optimistic)

9. **Case Document Generation**
   - Generate comprehensive dispute document including:
     - Patient information placeholder
     - Provider/billing department address
     - Summary of issues found with specific line items
     - Fair price benchmarks with sources
     - Specific dispute language for each issue
     - Legal references (No Surprises Act, state billing laws)
     - Requested actions (itemized bill if needed, corrections, adjusted total)
     - Professional closing

### 5.5 Outputs

| Field | Description |
|-------|-------------|
| billType | "itemized" or "summary" |
| totalBilled | Original bill amount |
| estimatedFairPrice | Benchmark-based fair price estimate |
| potentialSavings | Range of potential savings (min-max) |
| provider.name | Facility name from bill |
| provider.billingContact | Billing department contact if found |
| lineItems | Array of parsed charges |
| lineItems[].description | Service description |
| lineItems[].code | CPT/HCPCS code (parsed or inferred) |
| lineItems[].billedAmount | Amount charged |
| lineItems[].benchmarkAmount | Regional fair price |
| lineItems[].variance | Percentage above/below benchmark |
| lineItems[].flag | "fair", "high", "error", or null |
| annotations | Array of visual annotations |
| annotations[].boundingBox | Coordinates on document |
| annotations[].issueType | Type of flag |
| annotations[].shortDescription | Hover text |
| annotations[].fullExplanation | Detailed explanation |
| errors | Array of detected errors |
| errors[].type | "duplicate", "unbundling", "upcoding", "inflated", "missed_discount" |
| errors[].description | Plain language explanation |
| errors[].affectedItems | Line item references |
| errors[].estimatedOvercharge | Dollar amount |
| errors[].disputeLanguage | Suggested wording for dispute |
| caseDocument | Full dispute letter/document |
| generalTips | Always included; more prominent if no specific issues found |

### 5.6 Chat Interface

Bill Buster includes a conversational chat interface alongside the annotated bill view.

**Capabilities:**
- Answer questions about the uploaded bill
- Explain flagged issues in more detail
- Provide context on billing codes and medical terminology
- Suggest additional questions to ask the billing department
- Help user understand their rights
- Web search for additional pricing benchmarks or regulations

**Implementation:**
- Uses Vercel AI SDK with streaming responses
- Full conversation history maintained in session
- Context includes: parsed bill data, detected issues, annotations
- Web search tool available for real-time information lookup

**Scope:**
- Responds only to questions related to the bill, healthcare billing, and patient rights
- Redirects off-topic questions back to bill analysis

### 5.7 User Interface Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│  Bill Buster                                        [Upload New]    │
├─────────────────────────────────┬───────────────────────────────────┤
│                                 │                                   │
│   ┌─────────────────────────┐   │   Chat                            │
│   │                         │   │   ─────                           │
│   │   [Annotated Bill PDF]  │   │                                   │
│   │                         │   │   Agent: I found 3 potential      │
│   │   ┌───┐                 │   │   issues with your bill...        │
│   │   │ ! │ ← Red box       │   │                                   │
│   │   └───┘   (hoverable)   │   │   User: What's unbundling?        │
│   │                         │   │                                   │
│   │                         │   │   Agent: Unbundling is when...    │
│   │   ┌───┐                 │   │                                   │
│   │   │ ! │                 │   │   ┌─────────────────────────────┐ │
│   │   └───┘                 │   │   │ Type your question...       │ │
│   │                         │   │   └─────────────────────────────┘ │
│   └─────────────────────────┘   │                                   │
│                                 │   [Generate Case Document]        │
├─────────────────────────────────┴───────────────────────────────────┤
│  Summary: $4,200 billed | $2,800 fair estimate | $1,400 potential   │
│  savings | 3 issues found                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.8 Error Handling

| Condition | Behavior |
|-----------|----------|
| OCR fails or very low confidence | Ask user to upload clearer image |
| Bill is summary-only (non-itemized) | Note limitation prominently, extract what's possible, provide general tips, suggest requesting itemized bill with template language |
| Bill format not fully parseable | Extract what's possible, ask user to fill gaps via chat |
| No codes identifiable | Benchmark based on description, note lower confidence |
| Provider not in database | Use web search for regional averages, note source |
| No issues found | Display "No obvious errors detected" with general negotiation tips (request itemized bill, ask for uninsured discount, inquire about financial assistance, request payment plan) |

---

## 6. User Flows

### 6.1 Price Search Flow
```
User enters procedure (search with autocomplete)
    │
    ▼
User enters ZIP code
    │
    ▼
User selects insurance OR "I'll pay cash"
    │
    ▼
User clicks "Find Prices"
    │
    ▼
[Price Search Agent executes]
    │
    ▼
Results displayed:
    • Summary (median, range, provider count)
    • Provider list with prices and distance
    • Each row shows comparison to median
    │
    ▼
User can sort by price
    │
    ▼
User selects provider(s) for quote request
```

### 6.2 Assistant Flow (Email)
```
User selects provider from results
    │
    ▼
User clicks "Request Quote" → selects "Email"
    │
    ▼
[Assistant Agent executes - email path]
    │
    ▼
Results displayed:
    • Contact info found (email/form)
    • Source attribution
    • Email draft (editable)
    │
    ▼
User fills in name, edits if needed
    │
    ▼
User clicks "Copy to clipboard" or "Open in Gmail"
    │
    ▼
User sends from their own email
```

### 6.3 Assistant Flow (Phone)
```
User selects provider from results
    │
    ▼
User clicks "Request Quote" → selects "Call"
    │
    ▼
User confirms: "Call [Provider] on my behalf?"
    │
    ▼
[Assistant Agent executes - phone path via Vapi]
    │
    ▼
Live status: "Calling..." → "Connected" → "In progress"
    │
    ▼
Call completes
    │
    ▼
Results displayed:
    • Call outcome (success/voicemail/no answer)
    • Transcript
    • Extracted info (price, availability, payment plans)
    │
    ▼
Data saved to user session in MongoDB
```

### 6.4 Bill Buster Flow
```
User uploads bill (PDF or image)
    │
    ▼
User confirms insurance info
    │
    ▼
[Bill Buster Agent executes]
    │
    ▼
Two-panel view displayed:
    │
    ├─► LEFT: Annotated bill with red flag boxes
    │   • Hover over box → brief description tooltip
    │   • Click box → detailed explanation in chat
    │
    └─► RIGHT: Chat interface
        • Initial message summarizes findings
        • User can ask follow-up questions
        • Agent can search web for additional context
    │
    ▼
Bottom summary bar shows:
    • Total billed vs. fair estimate
    • Potential savings
    • Number of issues found
    │
    ▼
User clicks "Generate Case Document"
    │
    ▼
Case document displayed (static, copyable)
    • Summary of all issues
    • Dispute language for each
    • Where to send
    • Legal references
    │
    ▼
User copies or downloads document
    │
    ▼
User sends dispute to provider manually
```

---

## 7. Functional Requirements

### 7.1 Price Search

| ID | Requirement |
|----|-------------|
| PS-01 | User can search procedures by name, description, or CPT/HCPCS code |
| PS-02 | Search includes autocomplete from 70 most common CMS shoppable services |
| PS-03 | User can specify location by ZIP code |
| PS-04 | User can select insurance payer and plan type from list |
| PS-05 | User can select "cash / self-pay" option |
| PS-06 | Results show provider name, distance, and price |
| PS-07 | Results show comparison to median (% above/below) |
| PS-08 | Results can be sorted by price (low to high) |
| PS-09 | Summary shows median, min, max, and provider count |
| PS-10 | No login required |

### 7.2 Assistant

| ID | Requirement |
|----|-------------|
| AS-01 | User can choose between email or phone outreach |
| AS-02 | Agent searches web for provider's billing contact email |
| AS-03 | Agent can browse provider website to find contact info |
| AS-04 | Agent returns discovered contact method and source |
| AS-05 | Agent generates Good Faith Estimate request email |
| AS-06 | Email draft includes procedure name and CPT code |
| AS-07 | Email draft references the No Surprises Act |
| AS-08 | Email draft includes placeholder for patient name |
| AS-09 | User can edit the email draft |
| AS-10 | User can copy email to clipboard |
| AS-11 | User can open draft in email client via mailto: link |
| AS-12 | No automated email sending—user must send manually |
| AS-13 | Agent can initiate phone calls via Vapi |
| AS-14 | Voice agent uses ElevenLabs voice model |
| AS-15 | Voice agent requests Good Faith Estimate on call |
| AS-16 | Voice agent asks about availability and payment plans |
| AS-17 | Call transcript is saved to MongoDB |
| AS-18 | Extracted data (price, availability, payment plans) saved to MongoDB |
| AS-19 | User can view call transcript after completion |

### 7.3 Bill Buster

| ID | Requirement |
|----|-------------|
| BB-01 | User can upload bill as PDF |
| BB-02 | User can upload bill as image (PNG, JPG) |
| BB-03 | System extracts text from uploaded document via OCR |
| BB-04 | System identifies if bill is itemized or summary-only |
| BB-05 | System parses bill into structured line items |
| BB-06 | System identifies CPT/HCPCS codes from bill |
| BB-07 | System uses web search to find regional price benchmarks |
| BB-08 | System compares each charge to benchmark |
| BB-09 | System flags charges significantly above benchmark (>50%) |
| BB-10 | System detects duplicate charges |
| BB-11 | System detects unbundling violations |
| BB-12 | System detects potential upcoding |
| BB-13 | System detects missed discounts |
| BB-14 | System generates visual annotations with bounding boxes |
| BB-15 | Annotations display on left panel over bill image |
| BB-16 | Hovering annotation shows brief description |
| BB-17 | System calculates total potential savings |
| BB-18 | Chat interface displays on right panel |
| BB-19 | Chat provides initial summary of findings |
| BB-20 | User can ask follow-up questions in chat |
| BB-21 | Chat agent has web search capability |
| BB-22 | User can generate case document |
| BB-23 | Case document includes summary of issues |
| BB-24 | Case document includes dispute language for each issue |
| BB-25 | Case document includes billing department contact info |
| BB-26 | Case document includes legal references |
| BB-27 | Case document is copyable/downloadable |
| BB-28 | If no issues found, system displays general negotiation tips |
| BB-29 | If bill is summary-only, system prompts for itemized bill request |
| BB-30 | No login required |

---

## 8. Future Work (Out of Scope for Demo)

1. **User authentication** — Accounts, saved history, bill tracking
2. **Automated email sending** — Send emails on user's behalf
3. **Automated letter sending** — Send dispute letters on user's behalf
4. **Outcome tracking** — User uploads revised bill, system calculates actual savings
5. **Payment processing** — Collect 10% of savings (max $500)
6. **Expanded negotiation** — Multi-round dispute automation, appeals
7. **Geographic expansion** — Beyond SF Bay Area
8. **Procedure expansion** — Beyond 70 most common CMS shoppable services
9. **Insurance claim appeals** — Fight denials, not just bills
10. **Financial assistance applications** — Auto-apply to hospital charity care programs

---

## 9. Change Log

### Version 1.0 (January 2026) — Live Demo

**Overview changes:**
- Updated version from 0.1 (Prototype) to 1.0 (Live Demo)
- Added tagline: "Know what's fair. Pay what's fair."
- Clarified target user as cash-pay and high-deductible patients
- Confirmed scope as 70 most common CMS shoppable services

**Agent naming:**
- Renamed "Price Discovery Agent" → "Price Search Agent"
- Renamed "Outreach Agent" → "Assistant Agent"
- Renamed "Bill Analysis Agent" → "Bill Buster Agent"

**Section 4 (Assistant Agent) — Major updates:**
- Added phone outreach capability alongside email
- Added Vapi as voice agent framework
- Added ElevenLabs as voice model
- Added phone processing steps (call initiation, conversation flow, data capture)
- Added phone-specific outputs (transcript, extracted data, recording reference)
- Added MongoDB write for call outcomes (price estimate, availability, payment plans)
- Added phone-specific error handling

**Section 5 (Bill Buster Agent) — Major updates:**
- Added bill classification step (itemized vs. summary)
- Changed fair price benchmarking from database lookup to LLM + web search
- Added annotation generation with bounding boxes for visual flagging
- Added new Section 5.6: Chat Interface specification
- Added new Section 5.7: User Interface Layout diagram (two-panel: annotated bill + chat)
- Expanded case document requirements (dispute language, legal references, billing contact, requested actions)
- Updated non-itemized bill handling: extract what's possible, note limitation, provide general tips
- Added "no issues found" handling with general negotiation tips
- Expanded outputs to include annotations array with bounding box coordinates
- Added billType output field

**Section 6 (User Flows) — Updates:**
- Added Section 6.3: Assistant Flow (Phone)
- Rewrote Section 6.4: Bill Buster Flow to reflect two-panel UI and case document generation

**Section 7 (Functional Requirements) — Updates:**
- Renamed requirement IDs: PD → PS (Price Search), OA → AS (Assistant), BA → BB (Bill Buster)
- Added AS-13 through AS-19 for phone outreach requirements
- Added BB-14 through BB-17 for annotation and UI requirements
- Added BB-18 through BB-21 for chat interface requirements
- Added BB-22 through BB-27 for case document requirements
- Added BB-28 through BB-29 for edge case handling

**Section 8 (Future Work) — Updates:**
- Added outcome tracking
- Added payment processing (10% of savings, max $500)
- Added insurance claim appeals
- Added financial assistance applications

**Tech Stack — Updates:**
- Added Vapi (Voice Agent)
- Added ElevenLabs (Voice Model)