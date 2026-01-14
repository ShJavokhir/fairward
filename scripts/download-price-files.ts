#!/usr/bin/env bun
/**
 * Download Hospital Price Transparency Files
 *
 * Reads cost_downloadable_links.csv and downloads JSON/CSV files
 * Skips files > 100MB
 */

import { readFileSync, writeFileSync, unlinkSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const OUTPUT_DIR = join(import.meta.dir, '..', 'public_prices');
const CSV_PATH = join(import.meta.dir, '..', 'cost_downloadable_links.csv');

interface DownloadLink {
  hospital_name: string;
  region: string;
  source_page_url: string;
  mrf_download_url: string;
  file_type: string;
  contact_name: string;
  contact_email: string;
}

function parseCSV(content: string): DownloadLink[] {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const results: DownloadLink[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    results.push(obj as DownloadLink);
  }

  return results;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getFileExtension(url: string, fileType: string): string {
  // Try to get from URL
  const urlLower = url.toLowerCase();
  if (urlLower.includes('.json')) return '.json';
  if (urlLower.includes('.csv')) return '.csv';

  // Fall back to file_type
  if (fileType.toLowerCase() === 'json') return '.json';
  if (fileType.toLowerCase() === 'csv') return '.csv';

  return '';
}

async function downloadFile(url: string, outputPath: string): Promise<{ success: boolean; size: number; error?: string }> {
  try {
    console.log(`  Downloading from: ${url.substring(0, 80)}...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': '*/*',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return { success: false, size: 0, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    // Check content-length header first if available
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return { success: false, size: parseInt(contentLength), error: `File too large: ${(parseInt(contentLength) / 1024 / 1024).toFixed(1)}MB` };
    }

    const buffer = await response.arrayBuffer();
    const size = buffer.byteLength;

    if (size > MAX_FILE_SIZE) {
      return { success: false, size, error: `File too large: ${(size / 1024 / 1024).toFixed(1)}MB` };
    }

    writeFileSync(outputPath, Buffer.from(buffer));
    return { success: true, size };

  } catch (error) {
    return { success: false, size: 0, error: (error as Error).message };
  }
}

async function main() {
  console.log('\n📥 Hospital Price File Downloader\n');

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read and parse CSV
  const csvContent = readFileSync(CSV_PATH, 'utf-8');
  const links = parseCSV(csvContent);

  console.log(`Found ${links.length} hospitals in CSV\n`);

  // Filter for JSON and CSV files only
  const downloadableLinks = links.filter(link => {
    const type = link.file_type.toLowerCase();
    return type === 'json' || type === 'csv';
  });

  console.log(`${downloadableLinks.length} have JSON/CSV files to download\n`);

  // Track results
  const results = {
    downloaded: 0,
    skippedSize: 0,
    skippedExists: 0,
    errors: 0,
  };

  // Download each file
  for (let i = 0; i < downloadableLinks.length; i++) {
    const link = downloadableLinks[i];
    const ext = getFileExtension(link.mrf_download_url, link.file_type);
    const filename = `${sanitizeFilename(link.hospital_name)}_standardcharges${ext}`;
    const outputPath = join(OUTPUT_DIR, filename);

    console.log(`[${i + 1}/${downloadableLinks.length}] ${link.hospital_name}`);

    // Check if file already exists
    if (existsSync(outputPath)) {
      const existingSize = statSync(outputPath).size;
      console.log(`  ⏭️  Already exists (${(existingSize / 1024 / 1024).toFixed(1)}MB)\n`);
      results.skippedExists++;
      continue;
    }

    const result = await downloadFile(link.mrf_download_url, outputPath);

    if (result.success) {
      console.log(`  ✅ Downloaded: ${filename} (${(result.size / 1024 / 1024).toFixed(1)}MB)\n`);
      results.downloaded++;
    } else if (result.error?.includes('too large')) {
      console.log(`  ⚠️  Skipped: ${result.error}\n`);
      results.skippedSize++;
    } else {
      console.log(`  ❌ Error: ${result.error}\n`);
      results.errors++;
    }

    // Small delay to be nice to servers
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`  Downloaded: ${results.downloaded}`);
  console.log(`  Skipped (>100MB): ${results.skippedSize}`);
  console.log(`  Skipped (exists): ${results.skippedExists}`);
  console.log(`  Errors: ${results.errors}`);
  console.log();
}

main().catch(console.error);
