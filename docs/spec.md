# Fairward: Technical Specifications

**Version:** 0.1 (Prototype)  
**Last Updated:** January 2026

---

## 1. Overview

### 1.1 Purpose

Fairward is a multi-agent system that helps users understand healthcare pricing, obtain quotes from providers, and analyze medical bills for savings. This document defines the technical specifications for the prototype.

### 1.2 Prototype Scope

**In scope:**
- Price discovery for 70 CMS-defined shoppable services
- Provider quote requests via email (user-sent)
- Bill analysis for error detection and savings
- SF Bay Area providers only

**Out of scope:**
- User authentication and accounts
- Voice/phone outreach
- Automated email sending
- Bill negotiation execution
- Regions outside SF Bay Area

### 1.3 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js, TypeScript |
| Backend | Next.js API Routes |
| Database | MongoDB Atlas |
| LLM Provider | Fireworks |
| Agent Framework | NVIDIA NeMo Agent Toolkit |
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
│ Price Discovery │  │    Outreach     │  │  Bill Analysis  │
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
                    └─────────────────┘
```

### 2.2 Agent Design Principles

1. **Single responsibility:** Each agent does one thing well
2. **User-triggered:** No orchestrator; agents run when user takes action
3. **Shared context:** Agents communicate through MongoDB, not direct calls
4. **Human-in-the-loop:** User approves before any external contact
5. **Stateless execution:** Agents read inputs, produce outputs, maintain no internal state

### 2.3 Data Assumptions

- Pricing data from hospital MRFs is already ingested and queryable
- 70 CMS shoppable services are seeded in the database
- SF Bay Area providers (~50-100 facilities) are seeded with name, address, website, phone

---

## 3. Price Discovery Agent

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

## 4. Outreach Agent

### 4.1 Purpose

Find the best way to contact a healthcare provider and draft a Good Faith Estimate request for the user to send.

### 4.2 Trigger

User selects a provider from Price Discovery results and requests a quote.

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

### 4.4 Processing Steps

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

### 4.5 Outputs

| Field | Description |
|-------|-------------|
| contactMethod | "email", "contact_form", or "phone_only" |
| contactValue | Email address, form URL, or phone number |
| contactSource | URL where contact info was found |
| draft.subject | Email subject line |
| draft.body | Email body text |
| reasoning | Brief explanation of how contact was discovered |

### 4.6 Error Handling

| Condition | Behavior |
|-----------|----------|
| No email found | Return contact form URL or phone with call instructions |
| Website unreachable | Use web search results only, note limitation |
| Multiple possible contacts | Return most specific (billing > general) |

---

## 5. Bill Analysis Agent

### 5.1 Purpose

Analyze uploaded medical bills to detect errors, identify overcharges, and recommend actions for potential savings.

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

2. **Bill Parsing**
   - Use LLM to extract structured data:
     - Provider name and address
     - Date of service
     - Line items (description, code, quantity, price)
     - Totals, adjustments, patient responsibility

3. **Code Resolution**
   - For each line item, identify CPT/HCPCS code
   - If only description available, use LLM to infer likely code
   - Flag low-confidence matches

4. **Fair Price Benchmarking**
   - For each resolved code, query pricing database
   - Compare billed amount to regional median
   - Calculate variance percentage

5. **Error Detection**
   - Duplicate charges (same code billed multiple times)
   - Unbundling (services that should be bundled billed separately)
   - Upcoding (higher-cost code used when lower-cost applies)

6. **Savings Calculation**
   - Sum potential savings from correcting errors
   - Sum potential savings from negotiating high charges to median

7. **Recommendations**
   - Generate prioritized action list
   - Provide dispute language for detected errors

### 5.5 Outputs

| Field | Description |
|-------|-------------|
| totalBilled | Original bill amount |
| totalFairPrice | Fairward estimate of fair price |
| potentialSavings | Difference between billed and fair |
| lineItems | Each charge with billed vs. fair price, flag if problematic |
| errors | Detected errors with type, explanation, estimated overcharge |
| recommendations | Prioritized actions with suggested language |

### 5.6 Error Handling

| Condition | Behavior |
|-----------|----------|
| OCR fails | Ask user to upload clearer image |
| Bill format not parseable | Extract what's possible, ask user to fill gaps |
| No codes identifiable | Benchmark based on description, lower confidence |
| Provider not in database | Use regional averages, note limitation |

---

## 6. User Flows

### 6.1 Price Discovery Flow

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
[Price Discovery Agent executes]
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

### 6.2 Outreach Flow

```
User selects provider from results
    │
    ▼
User clicks "Request Quote"
    │
    ▼
[Outreach Agent executes]
    │
    ▼
Results displayed:
    • Contact info found (email/form/phone)
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

### 6.3 Bill Analysis Flow

```
User uploads bill (PDF or image)
    │
    ▼
User confirms insurance info
    │
    ▼
[Bill Analysis Agent executes]
    │
    ▼
Results displayed:
    • Summary (total billed vs. fair price, potential savings)
    • Line items with flags (fair, high, error)
    • Detected errors with explanations
    • Recommended actions
```

---

## 7. Functional Requirements

### 7.1 Price Discovery

| ID | Requirement |
|----|-------------|
| PD-01 | User can search procedures by name, description, or CPT/HCPCS code |
| PD-02 | Search includes autocomplete from 70 shoppable services |
| PD-03 | User can specify location by ZIP code |
| PD-04 | User can select insurance payer and plan type from list |
| PD-05 | User can select "cash / self-pay" option |
| PD-06 | Results show provider name, distance, and price |
| PD-07 | Results show comparison to median (% above/below) |
| PD-08 | Results can be sorted by price (low to high) |
| PD-09 | Summary shows median, min, max, and provider count |
| PD-10 | No login required |

### 7.2 Outreach

| ID | Requirement |
|----|-------------|
| OA-01 | Agent searches web for provider's billing contact email |
| OA-02 | Agent can browse provider website to find contact info |
| OA-03 | Agent returns discovered contact method and source |
| OA-04 | Agent generates Good Faith Estimate request email |
| OA-05 | Email draft includes procedure name and CPT code |
| OA-06 | Email draft references the No Surprises Act |
| OA-07 | Email draft includes placeholder for patient name |
| OA-08 | User can edit the email draft |
| OA-09 | User can copy email to clipboard |
| OA-10 | User can open draft in email client via mailto: link |
| OA-11 | No automated sending—user must send manually |

### 7.3 Bill Analysis

| ID | Requirement |
|----|-------------|
| BA-01 | User can upload bill as PDF |
| BA-02 | User can upload bill as image (PNG, JPG) |
| BA-03 | System extracts text from uploaded document |
| BA-04 | System parses bill into structured line items |
| BA-05 | System identifies CPT/HCPCS codes from bill |
| BA-06 | System compares each charge to fair price benchmark |
| BA-07 | System flags charges significantly above benchmark |
| BA-08 | System detects duplicate charges |
| BA-09 | System calculates total potential savings |
| BA-10 | System generates prioritized recommendations |
| BA-11 | User can view line-item details |
| BA-12 | No login required |

---

## 8. Future Work (Out of Scope)

1. **User authentication** — Accounts, saved history
2. **Automated email sending** — Send on user's behalf
3. **Voice outreach** — Phone calls to billing departments
4. **Negotiation agent** — Automated dispute and appeals
5. **Geographic expansion** — Beyond SF Bay Area
6. **Procedure expansion** — Beyond 70 shoppable services