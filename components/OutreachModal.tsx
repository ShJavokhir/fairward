"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

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

interface OutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName: string;
  providerAddress: string;
  providerPhone: string;
  procedureName: string;
  estimatedCost: number;
  insurance: { payerName: string; planType: string } | null;
}

type CallStatus = "idle" | "connecting" | "calling" | "ended" | "error";

const INSURANCE_OPTIONS = [
  { value: "none", label: "No insurance / Out-of-pocket" },
  { value: "blue_cross_ppo", label: "Blue Cross Blue Shield PPO" },
  { value: "blue_cross_hmo", label: "Blue Cross Blue Shield HMO" },
  { value: "united_ppo", label: "UnitedHealthcare PPO" },
  { value: "united_hmo", label: "UnitedHealthcare HMO" },
  { value: "aetna_ppo", label: "Aetna PPO" },
  { value: "aetna_hmo", label: "Aetna HMO" },
  { value: "cigna_ppo", label: "Cigna PPO" },
  { value: "cigna_hmo", label: "Cigna HMO" },
  { value: "kaiser", label: "Kaiser Permanente" },
  { value: "medicare", label: "Medicare" },
  { value: "medicaid", label: "Medicaid" },
  { value: "other", label: "Other insurance" },
];

// ============================================================================
// Component
// ============================================================================

export default function OutreachModal({
  isOpen,
  onClose,
  providerName,
  providerAddress,
  providerPhone,
  procedureName,
  estimatedCost,
  insurance,
}: OutreachModalProps) {
  // Email draft state
  const [outreachData, setOutreachData] = useState<OutreachResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"call" | "email">("call");

  // Voice call state
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [selectedInsurance, setSelectedInsurance] = useState("none");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callError, setCallError] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);

  // Fetch outreach data when modal opens (for email tab)
  useEffect(() => {
    async function fetchData() {
      if (!isOpen || outreachData || activeTab !== "email") return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/outreach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            procedureName,
            providerName,
            providerAddress,
            estimatedCost,
            insurance,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate outreach email");
        }

        const data: OutreachResponse = await response.json();
        setOutreachData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [isOpen, outreachData, activeTab, procedureName, providerName, providerAddress, estimatedCost, insurance]);

  // Update editable fields when data loads
  useEffect(() => {
    if (outreachData) {
      setSubject(outreachData.draft.subject);
      setBody(outreachData.draft.body);
    }
  }, [outreachData]);

  const handleCopyToClipboard = useCallback(async () => {
    const fullEmail = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = fullEmail;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [subject, body]);

  const handleOpenInEmail = useCallback(() => {
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");
  }, [subject, body]);

  const handleOpenInGmail = useCallback(() => {
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailLink, "_blank");
  }, [subject, body]);

  // Voice call functions
  const formatProcedureName = (name: string) => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const getInsuranceStatus = () => {
    if (selectedInsurance === "none") {
      return "self-pay, no insurance";
    }
    const option = INSURANCE_OPTIONS.find(o => o.value === selectedInsurance);
    return option ? `covered by ${option.label}` : "self-pay, no insurance";
  };

  const startCall = useCallback(async () => {
    if (!patientName || !patientEmail) {
      setCallError("Please enter your name and email address.");
      return;
    }

    setCallError(null);
    setCallStatus("connecting");
    setCallId(null);

    try {
      const response = await fetch("/api/vapi/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerPhone,
          procedureName: formatProcedureName(procedureName),
          patientName,
          patientEmail,
          patientPhone: patientPhone || "not provided",
          insuranceStatus: getInsuranceStatus(),
          providerName,
          estimatedCost: `$${estimatedCost.toLocaleString()}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate call");
      }

      setCallId(data.callId);
      setCallStatus("calling");
    } catch (err) {
      console.error("Failed to start call:", err);
      setCallError(err instanceof Error ? err.message : "Failed to start call");
      setCallStatus("error");
    }
  }, [patientName, patientEmail, patientPhone, procedureName, providerName, providerPhone, estimatedCost, selectedInsurance]);

  const handleClose = () => {
    setOutreachData(null);
    setSubject("");
    setBody("");
    setError(null);
    setCallStatus("idle");
    setCallError(null);
    setCallId(null);
    setPatientName("");
    setPatientEmail("");
    setPatientPhone("");
    setSelectedInsurance("none");
    onClose();
  };

  const canStartCall = patientName && patientEmail && callStatus === "idle";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F2E2E]/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-2xl border border-[#002125]/10 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#002125]/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0F2E2E]">Get a Price Quote</h2>
                <p className="text-[#5F7A7A] text-sm">{providerName}</p>
              </div>
              <button
                onClick={handleClose}
                className="size-8 flex items-center justify-center rounded-full hover:bg-[#F2FBEF] transition-colors"
                aria-label="Close modal"
              >
                <svg className="size-5 text-[#5F7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#002125]/10">
            <button
              onClick={() => setActiveTab("call")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === "call"
                  ? "text-[#002125] border-b-2 border-[#002125]"
                  : "text-[#5F7A7A] hover:text-[#0F2E2E]"
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                AI Phone Call
              </span>
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === "email"
                  ? "text-[#002125] border-b-2 border-[#002125]"
                  : "text-[#5F7A7A] hover:text-[#0F2E2E]"
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Draft
              </span>
            </button>
          </div>

          <div className="p-6">
            {/* Voice Call Tab */}
            {activeTab === "call" && (
              <div className="space-y-5">
                {/* Call Success State */}
                {callStatus === "calling" && (
                  <div className="text-center py-8">
                    <div className="size-16 bg-[#E9FAE7] rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="size-8 text-[#5A9A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[#0F2E2E] mb-2">Call in Progress</h3>
                    <p className="text-[#5F7A7A] text-sm mb-4 text-pretty">
                      Our AI assistant is calling {providerName} to request a price quote for your procedure.
                    </p>
                    <p className="text-[#5F7A7A] text-sm">
                      The quote will be sent to <strong className="text-[#0F2E2E]">{patientEmail}</strong>
                    </p>
                    {callId && (
                      <p className="text-[#5F7A7A]/70 text-xs mt-4">Reference: {callId}</p>
                    )}
                    <button
                      onClick={handleClose}
                      className="mt-6 px-6 py-2 bg-[#F2FBEF] hover:bg-[#E9FAE7] text-[#0F2E2E] rounded-full text-sm font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}

                {/* Connecting State */}
                {callStatus === "connecting" && (
                  <div className="text-center py-8">
                    <div className="size-16 bg-[#E9FAE7] rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="size-8 border-3 border-[#002125] border-t-transparent rounded-full animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#0F2E2E] mb-2">Initiating Call...</h3>
                    <p className="text-[#5F7A7A] text-sm">Please wait while we connect to the provider.</p>
                  </div>
                )}

                {/* Form State */}
                {(callStatus === "idle" || callStatus === "error") && (
                  <>
                    {/* Error Banner */}
                    {callError && (
                      <div className="bg-[#C47B8C]/10 border border-[#C47B8C]/20 rounded-lg p-3 flex items-start gap-2">
                        <svg className="size-5 text-[#C47B8C] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-[#C47B8C] text-sm">{callError}</span>
                      </div>
                    )}

                    {/* Procedure Info */}
                    <div className="bg-[#F2FBEF] rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-overline">Procedure</p>
                          <p className="font-medium text-[#0F2E2E]">{formatProcedureName(procedureName)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-overline">Est. Cost</p>
                          <p className="font-semibold text-[#0F2E2E] tabular-nums">${estimatedCost.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#0F2E2E] mb-1.5">
                          Your Name <span className="text-[#C47B8C]">*</span>
                        </label>
                        <input
                          type="text"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          placeholder="John Smith"
                          className="w-full px-3 py-2.5 bg-white border border-[#002125]/10 rounded-lg text-[#0F2E2E] placeholder:text-[#5F7A7A] focus:outline-none focus:border-[#002125]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#0F2E2E] mb-1.5">
                          Email <span className="text-[#C47B8C]">*</span>
                        </label>
                        <input
                          type="email"
                          value={patientEmail}
                          onChange={(e) => setPatientEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full px-3 py-2.5 bg-white border border-[#002125]/10 rounded-lg text-[#0F2E2E] placeholder:text-[#5F7A7A] focus:outline-none focus:border-[#002125]"
                        />
                        <p className="text-xs text-[#5F7A7A] mt-1">Quote will be sent here</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#0F2E2E] mb-1.5">
                          Phone <span className="text-[#5F7A7A] font-normal">(optional)</span>
                        </label>
                        <input
                          type="tel"
                          value={patientPhone}
                          onChange={(e) => setPatientPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                          className="w-full px-3 py-2.5 bg-white border border-[#002125]/10 rounded-lg text-[#0F2E2E] placeholder:text-[#5F7A7A] focus:outline-none focus:border-[#002125]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#0F2E2E] mb-1.5">
                          Insurance
                        </label>
                        <select
                          value={selectedInsurance}
                          onChange={(e) => setSelectedInsurance(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-[#002125]/10 rounded-lg text-[#0F2E2E] focus:outline-none focus:border-[#002125]"
                        >
                          {INSURANCE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Call Button */}
                    <button
                      onClick={startCall}
                      disabled={!canStartCall}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full font-medium transition-all",
                        canStartCall
                          ? "bg-[#002125] hover:bg-[#012E33] text-[#CEFDCE]"
                          : "bg-[#F2FBEF] text-[#5F7A7A]/50 cursor-not-allowed"
                      )}
                    >
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Request Quote by Phone
                    </button>

                    <p className="text-center text-xs text-[#5F7A7A]">
                      An AI assistant will call the provider on your behalf
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Email Tab */}
            {activeTab === "email" && (
              <div className="space-y-4">
                {isLoading && (
                  <div className="py-8 flex flex-col items-center justify-center">
                    <div className="size-10 border-3 border-[#002125] border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-[#5F7A7A] text-sm">Generating email draft...</p>
                  </div>
                )}

                {error && !isLoading && (
                  <div className="bg-[#C47B8C]/10 border border-[#C47B8C]/20 rounded-lg p-4 text-center">
                    <p className="text-[#C47B8C] text-sm mb-2">{error}</p>
                    <button
                      onClick={() => {
                        setError(null);
                        setOutreachData(null);
                      }}
                      className="text-[#C47B8C] text-sm font-medium hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {outreachData && !isLoading && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#0F2E2E] mb-1.5">Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-[#002125]/10 rounded-lg text-[#0F2E2E] focus:outline-none focus:border-[#002125] text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F2E2E] mb-1.5">Email Body</label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2.5 bg-white border border-[#002125]/10 rounded-lg text-[#0F2E2E] focus:outline-none focus:border-[#002125] font-mono text-sm leading-relaxed resize-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyToClipboard}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full font-medium transition-all text-sm",
                          copied
                            ? "bg-[#5A9A6B] text-white"
                            : "bg-[#F2FBEF] hover:bg-[#E9FAE7] text-[#0F2E2E]"
                        )}
                      >
                        {copied ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={handleOpenInGmail}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F2FBEF] hover:bg-[#E9FAE7] text-[#0F2E2E] rounded-full font-medium text-sm"
                      >
                        Gmail
                      </button>
                      <button
                        onClick={handleOpenInEmail}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#002125] hover:bg-[#012E33] text-[#CEFDCE] rounded-full font-medium text-sm"
                      >
                        Send Email
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
