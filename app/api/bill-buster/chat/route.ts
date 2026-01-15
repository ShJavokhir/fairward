import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { buildChatSystemPrompt } from "@/lib/bill-analysis";
import type { BillAnalysis } from "@/lib/types/bill-analysis";

export const maxDuration = 30;

const fireworks = createOpenAI({
  apiKey: process.env.FIREWORKS_API_KEY,
  baseURL: "https://api.fireworks.ai/inference/v1",
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
