/**
 * End-to-end test for bill analysis
 * Run with: bun run scripts/test-bill-e2e.ts
 */

import {
  extractTextFromImage,
  parseBillStructure,
  benchmarkPrices,
  detectIssues,
} from "../lib/bill-analysis";

// Create a simple test bill text (simulating OCR output)
const testBillText = `
STANFORD HEALTH CARE
300 Pasteur Drive
Stanford, CA 94305

Patient Account Statement

Account Number: 123456789
Date of Service: 01/15/2024
Patient: John Doe

ITEMIZED CHARGES:

Description                           CPT Code    Qty    Amount
---------------------------------------------------------------------
Emergency Room Visit - Level 4        99284       1      $2,450.00
CT Scan - Head w/o contrast           70450       1      $3,200.00
Laboratory Panel - Comprehensive      80053       1      $450.00
Glucose Test                          82947       1      $75.00
Sodium Test                           84295       1      $65.00
Potassium Test                        84132       1      $65.00
IV Therapy Administration             96360       1      $385.00
Pharmacy - Saline Solution            J7030       1      $125.00
---------------------------------------------------------------------
                              TOTAL CHARGES:      $6,815.00

Payment Due Upon Receipt

For billing inquiries, call: 1-800-555-1234
`;

async function main() {
  console.log("=== End-to-End Bill Analysis Test ===\n");

  // Step 1: Parse bill structure
  console.log("Step 1: Parsing bill structure...");
  try {
    const parsedBill = await parseBillStructure(testBillText);
    console.log("✓ Parsed bill:");
    console.log("  Provider:", parsedBill.provider.name);
    console.log("  Date:", parsedBill.dateOfService);
    console.log("  Account:", parsedBill.accountNumber);
    console.log("  Line items:", parsedBill.lineItems.length);
    console.log("  Total:", parsedBill.totalBilled);
    console.log("  Is Itemized:", parsedBill.isItemized);
    console.log("");

    if (parsedBill.lineItems.length > 0) {
      console.log("  Line items detail:");
      for (const item of parsedBill.lineItems.slice(0, 5)) {
        console.log(`    - ${item.description}: $${item.billedAmount} (${item.code || 'no code'})`);
      }
      if (parsedBill.lineItems.length > 5) {
        console.log(`    ... and ${parsedBill.lineItems.length - 5} more`);
      }
    }
    console.log("");

    // Step 2: Benchmark prices
    console.log("Step 2: Benchmarking prices...");
    const lineItemsWithBenchmarks = await benchmarkPrices(
      parsedBill.lineItems,
      "San Francisco Bay Area"
    );
    console.log("✓ Benchmarks applied");

    let flaggedCount = 0;
    for (const item of lineItemsWithBenchmarks) {
      if (item.flag) {
        flaggedCount++;
        console.log(`  - ${item.description}: $${item.billedAmount} vs $${item.benchmarkAmount} (${item.flag})`);
      }
    }
    console.log(`  Flagged items: ${flaggedCount}/${lineItemsWithBenchmarks.length}`);
    console.log("");

    // Step 3: Detect issues
    console.log("Step 3: Detecting issues...");
    const issues = await detectIssues(lineItemsWithBenchmarks, testBillText);
    console.log(`✓ Found ${issues.length} issues`);

    for (const issue of issues) {
      console.log(`  - ${issue.title} (${issue.type}): $${issue.estimatedSavings} savings`);
      console.log(`    ${issue.shortDescription}`);
    }
    console.log("");

    // Summary
    const totalBilled = parsedBill.totalBilled || lineItemsWithBenchmarks.reduce((sum, i) => sum + i.billedAmount, 0);
    const fairEstimate = lineItemsWithBenchmarks.reduce((sum, i) => sum + (i.benchmarkAmount || i.billedAmount), 0);
    const totalSavings = issues.reduce((sum, i) => sum + i.estimatedSavings, 0);

    console.log("=== Analysis Summary ===");
    console.log(`Total Billed: $${totalBilled.toLocaleString()}`);
    console.log(`Fair Estimate: $${fairEstimate.toLocaleString()}`);
    console.log(`Potential Savings: $${totalSavings.toLocaleString()}`);
    console.log("");
    console.log("✓ End-to-end test completed successfully!");

  } catch (error) {
    console.error("✗ Test failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
