import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Types
// ============================================================================

interface OutreachRequest {
  procedureName: string;
  providerName: string;
  providerAddress: string;
  estimatedCost: number;
  insurance: {
    payerName: string;
    planType: string;
  } | null;
}

interface OutreachResponse {
  contactMethod: "email" | "contact_form" | "phone_only";
  contactValue: string | null;
  contactSource: string | null;
  contactInstructions: string;
  draft: {
    subject: string;
    body: string;
  };
  fallbackContact: string;
  reasoning: string;
}

// ============================================================================
// Email Draft Generation
// ============================================================================

function generateEmailDraft(
  procedureName: string,
  providerName: string,
  estimatedCost: number,
  insurance: { payerName: string; planType: string } | null
): { subject: string; body: string } {
  const formattedProcedure = procedureName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const subject = `Good Faith Estimate Request: ${formattedProcedure}`;

  let insuranceSection: string;
  let requestDetails: string;

  if (insurance) {
    insuranceSection = `**Insurance Information:**
I am covered by ${insurance.payerName}, ${insurance.planType} plan. I am requesting an estimate of my expected out-of-pocket costs after insurance.`;

    requestDetails = `Please provide a written, itemized estimate that includes:
- Facility fees
- Physician/professional fees
- Anesthesia (if applicable)
- Any other anticipated ancillary services
- My estimated patient responsibility after insurance

If possible, please also confirm whether prior authorization is required for this procedure.`;
  } else {
    insuranceSection = `**Insurance Information:**
I am uninsured / electing to self-pay for this procedure. Under the No Surprises Act, I understand I have the right to receive a Good Faith Estimate as an uninsured patient.`;

    requestDetails = `Please provide a written, itemized estimate that includes:
- Facility fees
- Physician/professional fees
- Anesthesia (if applicable)
- Any other anticipated ancillary services

Additionally, please let me know if you offer:
- Cash-pay or prompt-pay discounts
- Payment plan options`;
  }

  const body = `Dear Billing Department,

I am writing to request a Good Faith Estimate for an upcoming medical procedure at ${providerName}.

**Patient:** [YOUR NAME]

**Requested Service:**
- Procedure: ${formattedProcedure}
- This is a scheduled/shoppable service

${insuranceSection}

**Reference Pricing:**
I have researched pricing for this procedure and found an estimated cost of $${estimatedCost.toLocaleString()} at your facility. I am requesting a formal Good Faith Estimate to confirm this amount.

**Legal Basis:**
Under the No Surprises Act (effective January 1, 2022), patients have the right to receive a Good Faith Estimate of expected charges for scheduled services. I am exercising this right.

**Request:**
${requestDetails}

Please send your response to this email address. If you require additional information to prepare the estimate, please let me know.

Thank you for your assistance.

Sincerely,
[YOUR NAME]
[YOUR PHONE NUMBER]
[YOUR EMAIL]`;

  return { subject, body };
}

// ============================================================================
// Contact Discovery (MVP: Fallback only)
// ============================================================================

function getContactInfo(providerName: string, _providerAddress: string): {
  contactMethod: "phone_only";
  contactValue: null;
  contactSource: null;
  contactInstructions: string;
  fallbackContact: string;
  reasoning: string;
} {
  // For MVP, we provide instructions to find the contact
  // Future: Implement web search/scraping for billing emails

  const cleanProviderName = providerName.replace(/[^\w\s]/g, "").trim();
  const searchQuery = encodeURIComponent(`${cleanProviderName} billing department contact`);
  const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;

  return {
    contactMethod: "phone_only",
    contactValue: null,
    contactSource: null,
    contactInstructions: `To find the billing department contact for ${providerName}:

1. **Search online:** Look for "${cleanProviderName} billing department" or "patient financial services"
2. **Visit provider website:** Look for "Billing", "Financial Services", or "Price Transparency" pages
3. **Call main line:** Call the facility and ask to be transferred to the billing department
4. **Request email:** When you reach billing, ask for their email address to send your Good Faith Estimate request`,
    fallbackContact: googleSearchUrl,
    reasoning: `Contact discovery requires searching ${providerName}'s website. For now, we've provided instructions to help you find the billing department contact.`,
  };
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: OutreachRequest = await request.json();

    const { procedureName, providerName, providerAddress, estimatedCost, insurance } = body;

    // Validate required fields
    if (!procedureName || !providerName || !providerAddress) {
      return NextResponse.json(
        { error: "Missing required fields: procedureName, providerName, providerAddress" },
        { status: 400 }
      );
    }

    // Generate email draft
    const draft = generateEmailDraft(procedureName, providerName, estimatedCost, insurance);

    // Get contact info (MVP: instructions only)
    const contactInfo = getContactInfo(providerName, providerAddress);

    const response: OutreachResponse = {
      contactMethod: contactInfo.contactMethod,
      contactValue: contactInfo.contactValue,
      contactSource: contactInfo.contactSource,
      contactInstructions: contactInfo.contactInstructions,
      draft,
      fallbackContact: contactInfo.fallbackContact,
      reasoning: contactInfo.reasoning,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in outreach API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
