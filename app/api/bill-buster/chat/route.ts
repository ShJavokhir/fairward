import { createFireworks } from "@ai-sdk/fireworks";
import { streamText } from "ai";
import { buildChatSystemPrompt } from "@/lib/bill-analysis";
import type { BillAnalysis } from "@/lib/types/bill-analysis";

export const maxDuration = 30;

const fireworks = createFireworks({
  apiKey: process.env.FIREWORKS_API_KEY,
});

export async function POST(req: Request) {
  const { messages, billAnalysis } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
    billAnalysis: BillAnalysis;
  };

  const systemPrompt = buildChatSystemPrompt(billAnalysis);

  const result = streamText({
    model: fireworks("accounts/fireworks/models/deepseek-v3p1"),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
