"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  context: string;
}

export function ChatPanel({ context }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
      };

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);
      setInput("");

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            context,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) throw new Error("Failed to send message");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No response body");

        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: accumulated }
                : m
            )
          );
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: "Sorry, something went wrong. Please try again." }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [context, isLoading, messages]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#0A4D4D] rounded-full shadow-lg shadow-[#0A4D4D]/30 flex items-center justify-center text-white hover:bg-[#0D5F5F] hover:scale-105 transition-all z-50"
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl shadow-[#0A4D4D]/15 border border-[#0F2E2E]/10 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-[#0A4D4D] text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2DD4BF]/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-[#2DD4BF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Pricing Assistant</h3>
              <p className="text-xs text-white/70">Ask about costs & providers</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FDFCFA]">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-[#E8F5F0] rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#0A4D4D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-[#0F2E2E] font-medium mb-1">How can I help?</p>
                <p className="text-[#5F7A7A] text-sm">Ask me about pricing, providers, or costs</p>
                <div className="mt-4 space-y-2">
                  <SuggestedQuestion text="Which hospital is cheapest?" onClick={sendMessage} disabled={isLoading} />
                  <SuggestedQuestion text="Explain the cost breakdown" onClick={sendMessage} disabled={isLoading} />
                  <SuggestedQuestion text="How much can I save?" onClick={sendMessage} disabled={isLoading} />
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                    message.role === "user"
                      ? "bg-[#0A4D4D] text-white rounded-br-md"
                      : "bg-white text-[#0F2E2E] rounded-bl-md border border-[#0F2E2E]/10 shadow-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content || (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-[#2DD4BF] rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-[#2DD4BF] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <span className="w-2 h-2 bg-[#2DD4BF] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-[#0F2E2E]/5 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about pricing..."
                className="flex-1 px-4 py-2 bg-[#F2FAF7] border border-[#0F2E2E]/10 rounded-xl text-sm text-[#0F2E2E] placeholder:text-[#5F7A7A] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/50 focus:border-[#2DD4BF]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-[#0A4D4D] text-white rounded-xl text-sm font-medium hover:bg-[#0D5F5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function SuggestedQuestion({
  text,
  onClick,
  disabled,
}: {
  text: string;
  onClick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      disabled={disabled}
      className="w-full px-3 py-2 text-left text-sm text-[#0F2E2E] bg-white hover:bg-[#E8F5F0] rounded-lg transition-colors border border-[#0F2E2E]/10 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {text}
    </button>
  );
}
