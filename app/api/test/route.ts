import { NextResponse } from "next/server";
import { getClientPromise } from "@/lib/mongodb";
import { getEmbedding } from "@/lib/voyage";

export async function GET() {
  const results: Record<string, unknown> = {};

  // Test MongoDB connection
  try {
    const client = await getClientPromise();
    await client.db("admin").command({ ping: 1 });
    results.mongodb = { status: "connected" };
  } catch (error) {
    results.mongodb = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Test Voyage AI
  try {
    const embedding = await getEmbedding("test");
    results.voyage = {
      status: "connected",
      embeddingDimension: embedding.length,
    };
  } catch (error) {
    results.voyage = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  return NextResponse.json(results);
}
