/**
 * Test script for bill analysis pipeline
 * Run with: bun run scripts/test-bill-analysis.ts
 */

import { execSync } from "child_process";

// Test pdftoppm availability
async function testPdfToPpm() {
  console.log("Testing pdftoppm availability...");

  try {
    const result = execSync("which pdftoppm", { encoding: "utf-8" });
    console.log("✓ pdftoppm found at:", result.trim());
    return true;
  } catch {
    console.error("✗ pdftoppm not found. Install poppler-utils:");
    console.error("  macOS: brew install poppler");
    console.error("  Ubuntu: apt-get install poppler-utils");
    return false;
  }
}

// Test Fireworks API connection
async function testFireworksApi() {
  console.log("\nTesting Fireworks API...");

  if (!process.env.FIREWORKS_API_KEY) {
    console.error("✗ FIREWORKS_API_KEY not set");
    return false;
  }

  console.log("✓ FIREWORKS_API_KEY is set");

  try {
    const { createFireworks } = await import("@ai-sdk/fireworks");
    const { generateText } = await import("ai");

    const fireworks = createFireworks({
      apiKey: process.env.FIREWORKS_API_KEY,
    });

    console.log("  Testing text model...");
    const result = await generateText({
      model: fireworks("accounts/fireworks/models/deepseek-v3p1"),
      prompt: "Say 'hello' and nothing else.",
    });

    console.log("  Response:", result.text);
    console.log("✓ Fireworks API working");
    return true;
  } catch (error) {
    console.error("✗ Fireworks API test failed:", error);
    return false;
  }
}

// Test generateObject with schema
async function testGenerateObject() {
  console.log("\nTesting generateObject with schema...");

  try {
    const { createFireworks } = await import("@ai-sdk/fireworks");
    const { generateObject } = await import("ai");
    const { z } = await import("zod");

    const fireworks = createFireworks({
      apiKey: process.env.FIREWORKS_API_KEY,
    });

    const schema = z.object({
      items: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        })
      ).default([]),
    });

    console.log("  Sending structured request...");
    const result = await generateObject({
      model: fireworks("accounts/fireworks/models/deepseek-v3p1"),
      schema,
      prompt: `Return a JSON object with 2 items. Example:
{
  "items": [
    { "id": "1", "name": "Apple" },
    { "id": "2", "name": "Banana" }
  ]
}`,
    });

    console.log("  Result:", JSON.stringify(result.object, null, 2));
    console.log("✓ generateObject working");
    return true;
  } catch (error) {
    console.error("✗ generateObject test failed:", error);
    return false;
  }
}

// Run all tests
async function main() {
  console.log("=== Bill Analysis Pipeline Tests ===\n");

  const results = {
    pdftoppm: await testPdfToPpm(),
    fireworksApi: await testFireworksApi(),
    generateObject: await testGenerateObject(),
  };

  console.log("\n=== Results ===");
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${passed ? "✓" : "✗"} ${test}`);
  }

  const allPassed = Object.values(results).every(Boolean);
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
