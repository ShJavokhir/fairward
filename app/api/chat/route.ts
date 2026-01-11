import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const maxDuration = 30;

const fireworks = createOpenAI({
  apiKey: process.env.FIREWORKS_API_KEY,
  baseURL: "https://api.fireworks.ai/inference/v1",
});

export async function POST(req: Request) {
  const { messages, context } = await req.json();

  const systemPrompt = `You are a helpful healthcare pricing assistant. You help users understand medical procedure costs and compare prices between different healthcare providers.

You have access to the following pricing data for the user's search:

${context}

Guidelines:
- Be concise and direct in your answers
- When comparing prices, always mention the specific dollar amounts
- Highlight potential savings when relevant
- Explain medical terms in simple language if the user seems confused
- If asked about something not in the data, say you don't have that information
- Format currency as USD (e.g., $1,234)
- Be empathetic - healthcare costs are stressful for people`;

  const result = streamText({
    model: fireworks("accounts/fireworks/models/deepseek-v3p1"),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
