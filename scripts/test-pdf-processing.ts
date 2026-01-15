/**
 * Test PDF processing (PDF to image conversion using pdftoppm)
 * Run with: bun run scripts/test-pdf-processing.ts
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import * as os from "os";

const MAX_PAGES = 10;

async function testPdfProcessing() {
  console.log("=== PDF Processing Test ===\n");

  // Check for pdftoppm
  try {
    execSync("which pdftoppm", { encoding: "utf-8" });
    console.log("✓ pdftoppm found");
  } catch {
    console.error("✗ pdftoppm not found. Install poppler-utils:");
    console.error("  macOS: brew install poppler");
    console.error("  Ubuntu: apt-get install poppler-utils");
    process.exit(1);
  }

  // Look for a PDF file in common locations
  const pdfPaths = [
    path.join(process.env.HOME || "", "Downloads"),
    "/tmp",
    process.cwd(),
  ];

  let pdfFile: string | null = null;

  for (const dir of pdfPaths) {
    try {
      const files = fs.readdirSync(dir);
      const pdf = files.find(f => f.endsWith(".pdf"));
      if (pdf) {
        pdfFile = path.join(dir, pdf);
        break;
      }
    } catch {
      // Directory doesn't exist or not readable
    }
  }

  if (!pdfFile) {
    console.log("No PDF file found. Skipping conversion test...");
    console.log("✓ pdftoppm is configured correctly");
    return;
  }

  console.log(`Found PDF: ${pdfFile}`);

  try {
    const pdfBuffer = fs.readFileSync(pdfFile);
    console.log(`PDF size: ${pdfBuffer.length} bytes`);

    // Create temp directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-test-"));
    const tempPdfPath = path.join(tempDir, "input.pdf");
    const outputPrefix = path.join(tempDir, "page");

    try {
      // Write PDF
      fs.writeFileSync(tempPdfPath, pdfBuffer);
      console.log("✓ PDF written to temp file");

      // Convert to PNG
      console.log("Converting PDF to PNG...");
      execSync(`pdftoppm -png -r 200 -l ${MAX_PAGES} "${tempPdfPath}" "${outputPrefix}"`, {
        timeout: 60000,
      });
      console.log("✓ PDF converted");

      // Read images
      const files = fs.readdirSync(tempDir)
        .filter(f => f.startsWith("page") && f.endsWith(".png"))
        .sort();

      console.log(`✓ Generated ${files.length} page(s)`);

      for (const file of files) {
        const imagePath = path.join(tempDir, file);
        const imageBuffer = fs.readFileSync(imagePath);
        const base64 = imageBuffer.toString("base64");
        console.log(`  ${file}: ${imageBuffer.length} bytes, ${base64.length} base64 chars`);
      }

      console.log("\n✓ PDF processing test completed successfully!");

    } finally {
      // Clean up
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
      fs.rmdirSync(tempDir);
    }

  } catch (error) {
    console.error("✗ PDF processing failed:", error);
    process.exit(1);
  }
}

testPdfProcessing().catch(console.error);
