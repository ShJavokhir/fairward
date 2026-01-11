"use client";

import { useState, useEffect, useCallback } from "react";

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
  const [activeTab, setActiveTab] = useState<"email" | "contact" | "call">("email");

  // Voice call state
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callError, setCallError] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);

  // Fetch outreach data when modal opens
  useEffect(() => {
    async function fetchData() {
      if (!isOpen || outreachData) return;

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
  }, [isOpen, outreachData, procedureName, providerName, providerAddress, estimatedCost, insurance]);

  // Update editable fields when data loads
  useEffect(() => {
    if (outreachData) {
      setSubject(outreachData.draft.subject);
      setBody(outreachData.draft.body);
    }
  }, [outreachData]);

  const retryFetch = useCallback(async () => {
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
  }, [procedureName, providerName, providerAddress, estimatedCost, insurance]);

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

  const startCall = useCallback(async () => {
    if (!patientName || !patientEmail) {
      setCallError("Please enter your name and email address.");
      return;
    }

    if (!providerPhone) {
      setCallError("Provider phone number is not available.");
      return;
    }

    setCallError(null);
    setCallStatus("connecting");
    setCallId(null);

    try {
      // Format insurance status
      const insuranceStatus = insurance
        ? `covered by ${insurance.payerName}, ${insurance.planType} plan`
        : "self-pay or uninsured";

      // Call the API to initiate outbound call
      const response = await fetch("/api/vapi/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerPhone,
          procedureName: formatProcedureName(procedureName),
          patientName,
          patientEmail,
          patientPhone: patientPhone || "not provided",
          insuranceStatus,
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
  }, [patientName, patientEmail, patientPhone, procedureName, providerName, providerPhone, estimatedCost, insurance]);

  const handleClose = () => {
    setOutreachData(null);
    setSubject("");
    setBody("");
    setError(null);
    setCallStatus("idle");
    setCallError(null);
    setCallId(null);
    onClose();
  };

  const hasPlaceholders = body.includes("[YOUR NAME]") || body.includes("[YOUR PHONE") || body.includes("[YOUR EMAIL]");
  const canStartCall = patientName && patientEmail && callStatus === "idle" && providerPhone;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Request Quote</h2>
                  <p className="text-white/80 text-sm">{providerName}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-12 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Generating your email draft...</p>
              <p className="text-slate-400 text-sm mt-1">This will just take a moment</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="p-8">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                <svg className="w-12 h-12 mx-auto text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-600 font-medium mb-2">Failed to generate email</p>
                <p className="text-red-500 text-sm">{error}</p>
                <button
                  onClick={retryFetch}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {outreachData && !isLoading && (
            <>
              {/* Tabs */}
              <div className="border-b border-slate-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab("email")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "email"
                        ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Email
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("call")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "call"
                        ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Voice Call
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("contact")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "contact"
                        ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Info
                    </span>
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {/* Email Tab */}
                {activeTab === "email" && (
                  <div className="space-y-4">
                    {hasPlaceholders && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-amber-800 font-medium text-sm">Fill in your details before sending</p>
                          <p className="text-amber-600 text-sm mt-1">
                            Replace <code className="bg-amber-100 px-1 rounded">[YOUR NAME]</code>, <code className="bg-amber-100 px-1 rounded">[YOUR PHONE NUMBER]</code>, and <code className="bg-amber-100 px-1 rounded">[YOUR EMAIL]</code> with your information.
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Email Body</label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={16}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm leading-relaxed resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Voice Call Tab */}
                {activeTab === "call" && (
                  <div className="space-y-4">
                    {/* Call Status Banner */}
                    {callStatus === "calling" && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-emerald-700 font-medium">Call initiated</span>
                        </div>
                        <p className="text-emerald-600 text-sm">
                          Our AI assistant Avery is now calling {providerName}. The hospital will receive the Good Faith Estimate request and send it to your email.
                        </p>
                        {callId && (
                          <p className="text-emerald-500 text-xs mt-2">Call ID: {callId}</p>
                        )}
                      </div>
                    )}

                    {callStatus === "connecting" && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-blue-700 font-medium">Initiating call...</span>
                      </div>
                    )}

                    {callStatus === "ended" && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-700 font-medium">Call completed</span>
                      </div>
                    )}

                    {callError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-red-700 text-sm">{callError}</span>
                      </div>
                    )}

                    {/* User Details Form (only show when idle or error) */}
                    {(callStatus === "idle" || callStatus === "error") && (
                      <>
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                          <p className="text-indigo-800 font-medium text-sm mb-2">How voice calling works</p>
                          <p className="text-indigo-700 text-sm">
                            Our AI assistant Avery will call the hospital&apos;s billing department on your behalf to request a Good Faith Estimate. The estimate will be sent to your email.
                          </p>
                        </div>

                        {/* Provider phone display */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Calling</p>
                          <p className="text-slate-800 font-medium">{providerName}</p>
                          <p className="text-slate-600 text-sm">{providerPhone || "Phone number not available"}</p>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">
                              Your Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={patientName}
                              onChange={(e) => setPatientName(e.target.value)}
                              placeholder="John Smith"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">
                              Your Email <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              value={patientEmail}
                              onChange={(e) => setPatientEmail(e.target.value)}
                              placeholder="john@example.com"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <p className="text-xs text-slate-400 mt-1">The hospital will send the estimate to this email</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">
                              Your Phone <span className="text-slate-400">(optional)</span>
                            </label>
                            <input
                              type="tel"
                              value={patientPhone}
                              onChange={(e) => setPatientPhone(e.target.value)}
                              placeholder="(555) 123-4567"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <p className="text-xs text-slate-400 mt-1">For callbacks if the hospital needs to reach you</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Call Controls */}
                    {(callStatus === "idle" || callStatus === "error") && (
                      <button
                        onClick={startCall}
                        disabled={!canStartCall}
                        className={`w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl font-medium transition-all ${
                          canStartCall
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Call {providerName}
                      </button>
                    )}

                    {callStatus === "connecting" && (
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-slate-200 text-slate-400 rounded-xl font-medium cursor-not-allowed"
                      >
                        <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        Initiating call...
                      </button>
                    )}

                    {callStatus === "calling" && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                        <p className="text-emerald-700 text-sm">
                          The call is in progress. You&apos;ll receive the Good Faith Estimate at <strong>{patientEmail}</strong>.
                        </p>
                        <button
                          onClick={() => {
                            setCallStatus("idle");
                            setCallId(null);
                            setCallError(null);
                          }}
                          className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    )}

                    {callStatus === "ended" && (
                      <button
                        onClick={() => {
                          setCallStatus("idle");
                          setCallId(null);
                          setCallError(null);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Start New Call
                      </button>
                    )}
                  </div>
                )}

                {/* Contact Tab */}
                {activeTab === "contact" && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-blue-800 font-medium">How to find the billing contact</p>
                          <div className="text-blue-700 text-sm mt-2 whitespace-pre-line">
                            {outreachData.contactInstructions}
                          </div>
                        </div>
                      </div>
                    </div>

                    {outreachData.fallbackContact && (
                      <a
                        href={outreachData.fallbackContact}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search for Billing Contact
                      </a>
                    )}

                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-slate-500 text-sm">{outreachData.reasoning}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions - only show for email tab */}
              {activeTab === "email" && (
                <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleCopyToClipboard}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                        copied
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                      }`}
                    >
                      {copied ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleOpenInGmail}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl font-medium transition-colors"
                    >
                      <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                      </svg>
                      Gmail
                    </button>

                    <button
                      onClick={handleOpenInEmail}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/25"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </button>
                  </div>

                  <p className="text-center text-xs text-slate-400 mt-3">
                    You&apos;ll send this email from your own account. We never send emails on your behalf.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
