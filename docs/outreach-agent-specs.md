# Fairward: Outreach Agent Technical Specifications

**Version:** 0.1 (Prototype)  
**Last Updated:** January 2026

---

## 1. Overview

### 1.1 Purpose

This document defines the technical specifications for the Fairward Outreach Agent—the first agent in our multi-agent system. The Outreach Agent finds the best way to contact a healthcare provider and drafts a Good Faith Estimate request for the user to send.

### 1.2 Scope

The Outreach Agent:
- Takes a procedure and provider as input
- Searches for the provider's billing/pricing contact information
- Drafts a Good Faith Estimate request email per the No Surprises Act
- Presents the draft for user approval before any external contact

Out of scope:
- Automated email sending (user sends from their own email)
- Phone/voice outreach
- Follow-up tracking
- Response handling

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

### 2.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         User Input                          │
│  • Procedure: "Colonoscopy"                                 │
│  • CPT Code: "45385"                                        │
│  • Provider: "NorthBay VacaValley Hospital"                 │
│  • Address: "1000 Nut Tree Rd, Vacaville, CA 95687"         │
│  • Website: "northbay.org"                                  │
│  • Phone: "(707) 624-7000"                                  │
│  • Insurance: {payer, plan} or "cash"                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Outreach Agent                         │
│                                                             │
│  Step 1: Contact Discovery                                  │
│  • Search web for provider's billing/pricing contact        │
│  • Browse provider website if needed                        │
│  • Find email address, contact form, or billing dept info   │
│                                                             │
│  Step 2: Draft Generation                                   │
│  • Generate Good Faith Estimate request email               │
│  • Personalize with procedure, insurance, patient context   │
│  • Follow No Surprises Act language requirements            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        User Review                          │
│  • Display draft email with subject and body                │
│  • Show discovered contact (email or instructions)          │
│  • User can edit draft                                      │
│  • User copies text or opens in email client                │
│  • User sends from their own email                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Agent Design Principles

1. **Human-in-the-loop:** Agent drafts, human approves and sends
2. **Transparent reasoning:** Agent explains how it found contact info
3. **Graceful degradation:** If email not found, provide alternative contact methods
4. **Stateless execution:** Agent reads inputs, produces outputs, maintains no internal state

---

## 3. Outreach Agent Specification

### 3.1 Purpose

Find the best way to contact a healthcare provider for pricing information and draft a Good Faith Estimate request that the user can send.

### 3.2 Trigger

User provides procedure details and selects a provider to contact.

### 3.3 Inputs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| procedureName | String | Yes | Plain language name (e.g., "Colonoscopy") |
| cptCode | String | Yes | CPT/HCPCS code (e.g., "45385") |
| providerName | String | Yes | Facility name |
| providerAddress | String | Yes | Full street address |
| providerWebsite | String | Yes | Provider's website URL |
| providerPhone | String | Yes | Main phone number |
| insurance | Object or null | Yes | `{payerName, planType}` or null for cash/self-pay |

### 3.4 Processing Steps

#### Step 1: Contact Discovery

The agent must find the best contact method for requesting a price estimate. Search priority:

1. **Billing department email** — Ideal for written price requests
2. **Price transparency or financial services email** — Often handles GFE requests
3. **Patient financial services contact form** — Acceptable if no email
4. **General billing phone number** — Fallback if no email/form found

Discovery methods:
- Web search: `"{provider name}" billing email` or `"{provider name}" good faith estimate contact`
- Website browse: Navigate provider website to find billing/financial services contact page
- Price transparency page: Check if provider lists a contact for pricing questions

The agent should:
- Prioritize official provider sources over third-party directories
- Verify the email domain matches the provider's website
- Note the source where contact info was found (for user confidence)

#### Step 2: Draft Generation

Generate a Good Faith Estimate request email following No Surprises Act requirements.

**Required elements in the draft:**

1. **Subject line:** Clear request for Good Faith Estimate with procedure name
2. **Patient identification:** Name placeholder for user to fill in
3. **Procedure specification:** Both plain language name AND CPT code
4. **Service context:** Mention this is a scheduled/shoppable service
5. **Insurance status:** State insurance info OR that patient is uninsured/self-pay
6. **Legal reference:** Cite the No Surprises Act right to a Good Faith Estimate
7. **Response request:** Ask for itemized written estimate
8. **Timeline:** Request response within reasonable timeframe

**Tone requirements:**
- Professional and polite
- Clear and direct
- Not adversarial

**The draft must NOT:**
- Include false statements about the patient
- Make legal threats
- Include placeholder text that could be sent accidentally
- Exceed reasonable length (aim for 200-300 words)

### 3.5 Outputs

| Field | Description |
|-------|-------------|
| contactMethod | "email", "contact_form", or "phone_only" |
| contactValue | Email address, form URL, or phone number |
| contactSource | Where the contact info was found (URL) |
| draft.subject | Email subject line |
| draft.body | Email body text |
| fallbackContact | Alternative contact if primary method fails |
| reasoning | Brief explanation of how contact was discovered |

### 3.6 Error Handling

| Condition | Behavior |
|-----------|----------|
| No email found | Return contact form URL if available, otherwise return phone with instructions to call and request email |
| Website unreachable | Use web search results only, note limitation |
| Multiple possible contacts | Return the most specific (billing > general), note alternatives |
| Provider appears to not exist | Return error, ask user to verify provider details |

---

## 4. Good Faith Estimate Requirements

### 4.1 Legal Background

The No Surprises Act (effective January 1, 2022) requires healthcare providers to give uninsured or self-pay patients a Good Faith Estimate of expected charges upon request or when scheduling a service.

Key provisions:
- Patients have the right to request a GFE for any scheduled service
- Providers must deliver the GFE within specified timeframes
- The GFE must include expected charges for the primary service and reasonably anticipated ancillary services
- If the final bill exceeds the GFE by $400+, patients can dispute through a federal process

### 4.2 GFE Request Email Template Structure

The LLM should generate emails following this structure (not copy this verbatim):

**Section 1: Opening**
- Greeting
- State purpose: requesting a Good Faith Estimate

**Section 2: Patient Information**
- Placeholder for patient name: `[PATIENT NAME]`
- Note: User must fill this in before sending

**Section 3: Service Details**
- Procedure name in plain language
- CPT/HCPCS code
- Mention this is a scheduled/shoppable service

**Section 4: Insurance Status**
- If insured: State payer and plan type, note requesting estimate of patient responsibility
- If self-pay/uninsured: State patient is uninsured or electing self-pay

**Section 5: Legal Basis**
- Reference the No Surprises Act
- Note patient's right to receive a Good Faith Estimate

**Section 6: Request Specifics**
- Request itemized estimate including:
  - Facility fees
  - Physician/professional fees
  - Anticipated ancillary services (anesthesia, labs, imaging if applicable)
- Request written response via email

**Section 7: Closing**
- Thank the recipient
- Provide callback method (user's email/phone placeholder)

### 4.3 Email Variations

The agent should adjust the email based on insurance status:

**For insured patients:**
- Mention payer and plan
- Request estimate of patient responsibility after insurance
- Ask if provider can verify benefits/authorization requirements

**For self-pay/uninsured patients:**
- Explicitly state uninsured or self-pay election
- Reference No Surprises Act protections for uninsured patients
- Ask about cash-pay discounts or payment plans

---

## 5. User Flow

```
User arrives with procedure and provider selected
    │
    ▼
User clicks "Request Quote" for a provider
    │
    ▼
Loading state: "Finding best way to contact this provider..."
    │
    ▼
[Outreach Agent executes - Contact Discovery]
    │
    ▼
Loading state: "Drafting your Good Faith Estimate request..."
    │
    ▼
[Outreach Agent executes - Draft Generation]
    │
    ▼
Results displayed:
    │
    ├── Contact info card
    │   • Contact method found (email/form/phone)
    │   • Source attribution ("Found on provider's billing page")
    │
    ├── Email draft
    │   • Subject line (editable)
    │   • Body text (editable)
    │   • Clear marker for [PATIENT NAME] placeholder
    │
    └── Actions
        • "Copy to clipboard" button
        • "Open in Gmail" button (mailto: link)
        • "Open in Outlook" button (mailto: link)
        │
        ▼
User fills in their name, edits if needed
    │
    ▼
User copies or opens in email client
    │
    ▼
User sends from their own email
```

---

## 6. Functional Requirements

| ID | Requirement |
|----|-------------|
| OA-01 | Agent accepts procedure name, CPT code, provider name, address, website, phone, and insurance info as inputs |
| OA-02 | Agent searches web for provider's billing/pricing contact email |
| OA-03 | Agent can browse provider website to find contact information |
| OA-04 | Agent returns the discovered contact method (email, form URL, or phone) |
| OA-05 | Agent cites the source where contact info was found |
| OA-06 | Agent generates Good Faith Estimate request email draft |
| OA-07 | Email draft includes procedure name and CPT code |
| OA-08 | Email draft references the No Surprises Act |
| OA-09 | Email draft is personalized to patient's insurance status |
| OA-10 | Email draft includes clear placeholder for patient name |
| OA-11 | User can view the generated email draft |
| OA-12 | User can edit the email draft before sending |
| OA-13 | User can copy email text to clipboard |
| OA-14 | User can open draft in email client via mailto: link |
| OA-15 | System requires user action to send—no automated sending |
| OA-16 | If no email found, agent provides fallback contact method |

---

## 7. Future Work (Out of Scope)

Documented for future phases:

1. **Automated email sending** — Send on user's behalf with their permission
2. **Response tracking** — Monitor user's inbox for provider replies
3. **Follow-up automation** — Send reminder if no response in X days
4. **Contact form filling** — Auto-fill web forms instead of email
5. **Phone outreach** — Voice AI to call billing departments
6. **Multi-provider batch** — Request quotes from multiple providers at once

---

## 8. Appendix: Example Good Faith Estimate Request

**Subject:** Good Faith Estimate Request: Colonoscopy (CPT 45385)

**Body:**

Dear Billing Department,

I am writing to request a Good Faith Estimate for an upcoming medical procedure.

**Patient:** [PATIENT NAME]

**Requested Service:**
- Procedure: Colonoscopy (diagnostic/screening)
- CPT Code: 45385

**Insurance Information:**
I am covered by Blue Shield of California, PPO plan. I am requesting an estimate of my expected out-of-pocket costs after insurance.

**Legal Basis:**
Under the No Surprises Act, patients have the right to receive a Good Faith Estimate of expected charges for scheduled services. I am exercising this right.

**Request:**
Please provide a written, itemized estimate that includes:
- Facility fees
- Physician/professional fees
- Anesthesia (if applicable)
- Any other anticipated ancillary services

Please send your response to this email address. If you require additional information to prepare the estimate, please let me know.

Thank you for your assistance.

Sincerely,
[PATIENT NAME]
[PATIENT PHONE/EMAIL]