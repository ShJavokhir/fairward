import { NextRequest, NextResponse } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";

// ============================================================================
// Types
// ============================================================================

interface CallRequest {
  providerPhone: string;
  procedureName: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  insuranceStatus: string;
  providerName: string;
  estimatedCost: string;
}

// ============================================================================
// Voice Assistant System Prompt
// ============================================================================

function getSystemPrompt(variables: {
  procedureName: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  insuranceStatus: string;
  providerName: string;
  estimatedCost: string;
}): string {
  return `## Identity

You are Avery, a patient advocate assistant helping patients get price estimates from healthcare providers. You are making an OUTBOUND call to ${variables.providerName}'s billing department.

You are professional, friendly, and knowledgeable about the No Surprises Act and patient rights regarding medical pricing transparency.

## Context

This is an OUTBOUND call that YOU initiated. You are calling the provider's billing department to request a price estimate for a patient. The person who answers works at ${variables.providerName}.

## Style

- Speak in a warm, professional tone
- Be patient and polite, even if transferred multiple times
- Use natural speech patterns
- Pronounce numbers naturally: say "four hundred fifty dollars" not "four five zero dollars"
- Keep responses concise—this is a phone call, not a lecture
- If you need to spell something, say "that's spelled" and then spell it clearly

## Your Goal

Get a price estimate for ${variables.procedureName} and end the call once you have the information.

## Conversation Flow

### 1. Introduction
When someone answers:
"Hi, this is Avery. I'm calling on behalf of a patient who is considering having a ${variables.procedureName} at your facility. I was hoping to get a price estimate for this procedure. Is this the billing department?"

### 2. If you need to be transferred
- Say "Of course, thank you" and wait
- When someone new answers, briefly re-introduce: "Hi, I'm Avery calling to get a price estimate for a procedure on behalf of a patient."

### 3. Request the price
Once you reach billing:
"The patient is looking to get a ${variables.procedureName}. They are ${variables.insuranceStatus}. Could you give me an estimate for what this procedure would cost?"

### 4. When they give you a price
- Thank them for the information
- Confirm the price by repeating it back
- Ask if that includes all fees (facility, physician, anesthesia if applicable)
- If the price is significantly different from ${variables.estimatedCost}, you can mention: "I had seen estimates around ${variables.estimatedCost} online—does that sound about right, or does it vary?"

### 5. End the call gracefully
Once you have the price confirmed:
"Perfect, that's very helpful. Would you be able to send a written estimate to the patient at ${variables.patientEmail}? ... Great, thank you so much for your help. Have a great day!"

Then END THE CALL.

## Important Rules

1. Once you get a price estimate and confirm it, END THE CALL. Don't keep the conversation going unnecessarily.
2. If they can't give a price over the phone, ask for an email address or form to submit a written request, then end the call.
3. If you reach voicemail, leave a brief message with the patient's callback number ${variables.patientPhone} and end the call.
4. Never pretend to be the patient—you are calling on their behalf.
5. If asked for information you don't have, say "I don't have that information with me, but the patient can provide it directly."

## Patient Information (only share if asked)

- Patient Name: ${variables.patientName}
- Insurance: ${variables.insuranceStatus}
- Email for written estimate: ${variables.patientEmail}
- Callback phone: ${variables.patientPhone}`;
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

  if (!apiKey) {
    return NextResponse.json(
      { error: "VAPI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  if (!phoneNumberId) {
    return NextResponse.json(
      { error: "VAPI_PHONE_NUMBER_ID is not configured" },
      { status: 500 }
    );
  }

  try {
    const body: CallRequest = await request.json();

    const {
      providerPhone,
      procedureName,
      patientName,
      patientEmail,
      patientPhone,
      insuranceStatus,
      providerName,
      estimatedCost,
    } = body;

    // Validate required fields
    if (!procedureName || !patientName || !patientEmail || !providerName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Initialize Vapi client
    const vapi = new VapiClient({ token: apiKey });

    // DEMO: Hardcoded phone number for testing
    const demoPhoneNumber = "+16672925962";

    // Create the outbound call
    const call = await vapi.calls.create({
      phoneNumberId: phoneNumberId,
      customer: {
        number: demoPhoneNumber, // Using demo number instead of providerPhone
      },
      assistant: {
        name: "Patient Advocate - Avery",
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: getSystemPrompt({
                procedureName,
                patientName,
                patientEmail,
                patientPhone: patientPhone || "not provided",
                insuranceStatus,
                providerName,
                estimatedCost,
              }),
            },
          ],
        },
        voice: {
          provider: "11labs",
          voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - professional female voice
        },
        firstMessage: `Hi, this is Avery. I'm calling on behalf of a patient who is considering having a ${procedureName} at your facility. I was hoping to get a price estimate for this procedure. Is this the billing department?`,
      },
    });

    // Type narrow to check if it's a Call (has id property)
    if ("id" in call) {
      return NextResponse.json({
        success: true,
        callId: call.id,
        status: call.status,
      });
    }

    // If it's a batch response, return success without specific call info
    return NextResponse.json({
      success: true,
      message: "Call initiated",
    });
  } catch (error) {
    console.error("Vapi call error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to initiate call",
      },
      { status: 500 }
    );
  }
}
