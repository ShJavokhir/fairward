#!/usr/bin/env node
/**
 * Script to download CMS Hospital Price Transparency files from Bay Area hospitals.
 * Downloads all machine-readable files listed in cost_downloadable_links.csv
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { parse } = require('url');

// Configuration
const CSV_FILE = 'cost_downloadable_links.csv';
const OUTPUT_DIR = 'public_prices';
const TIMEOUT = 120000; // 120 seconds
const DELAY_BETWEEN_REQUESTS = 500; // ms
const MAX_REDIRECTS = 10;

// Stats
let successful = 0;
let failed = 0;
let totalBytes = 0;
const results = [];
const failedDownloads = [];

/**
 * Sanitize hospital name for use as filename
 */
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^\w\-_.]/g, '')
    .substring(0, 100);
}

/**
 * Get file extension from URL or file type
 */
function getExtension(url, fileType) {
  const urlPath = parse(url).pathname || '';

  if (urlPath.endsWith('.csv')) return '.csv';
  if (urlPath.endsWith('.json')) return '.json';
  if (urlPath.endsWith('.zip')) return '.zip';
  if (urlPath.endsWith('.xlsx')) return '.xlsx';
  if (urlPath.endsWith('.xml')) return '.xml';

  const ft = fileType.toLowerCase();
  if (ft.includes('csv')) return '.csv';
  if (ft.includes('json')) return '.json';
  if (ft.includes('zip')) return '.zip';
  if (ft.includes('api')) return '.json';

  return '.json'; // Default
}

/**
 * Parse CSV file
 */
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || '';
    });
    return obj;
  });
}

/**
 * Download a file with redirect support
 */
function downloadFile(url, filepath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      reject(new Error('Too many redirects'));
      return;
    }

    const parsedUrl = parse(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: 'GET',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
      }
    };

    const req = protocol.request(options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectUrl}`;
        }
        resolve(downloadFile(redirectUrl, filepath, redirectCount + 1));
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      let downloadedBytes = 0;

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(downloadedBytes);
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete partial file
        reject(err);
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('CMS Hospital Price Transparency File Downloader');
  console.log('='.repeat(70));

  // Read CSV
  const csvPath = path.join(__dirname, CSV_FILE);
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const hospitals = parseCSV(csvContent);
  console.log(`\nFound ${hospitals.length} hospitals to download\n`);

  // Create output directory
  const outputDir = path.join(__dirname, OUTPUT_DIR);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  console.log(`Output directory: ${outputDir}\n`);
  console.log('Starting downloads...\n');

  // Process each hospital
  for (let i = 0; i < hospitals.length; i++) {
    const hospital = hospitals[i];
    const hospitalName = hospital.hospital_name;
    const url = hospital.mrf_download_url;
    const fileType = hospital.file_type;
    const region = hospital.region;

    console.log(`[${i + 1}/${hospitals.length}] Downloading ${hospitalName}...`);

    // Create region directory
    const regionDir = path.join(outputDir, sanitizeFilename(region));
    if (!fs.existsSync(regionDir)) {
      fs.mkdirSync(regionDir, { recursive: true });
    }

    // Generate filename
    const baseName = sanitizeFilename(hospitalName);
    const ext = getExtension(url, fileType);
    let filename = `${baseName}${ext}`;
    let filepath = path.join(regionDir, filename);

    // Handle duplicates
    let counter = 1;
    while (fs.existsSync(filepath)) {
      filename = `${baseName}_${counter}${ext}`;
      filepath = path.join(regionDir, filename);
      counter++;
    }

    try {
      const bytes = await downloadFile(url, filepath);
      console.log(`  [OK] ${filename} (${bytes.toLocaleString()} bytes)`);
      successful++;
      totalBytes += bytes;
      results.push({
        hospital: hospitalName,
        url,
        success: true,
        filename: path.relative(__dirname, filepath),
        size: bytes,
        error: ''
      });
    } catch (err) {
      console.log(`  [FAIL] ${err.message}`);
      failed++;
      failedDownloads.push({ hospital: hospitalName, error: err.message });
      results.push({
        hospital: hospitalName,
        url,
        success: false,
        filename: '',
        size: 0,
        error: err.message
      });
    }

    // Delay between requests
    if (i < hospitals.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('DOWNLOAD SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total hospitals: ${hospitals.length}`);
  console.log(`Successful downloads: ${successful}`);
  console.log(`Failed downloads: ${failed}`);
  console.log(`Total data downloaded: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

  if (failedDownloads.length > 0) {
    console.log('\nFailed downloads:');
    failedDownloads.forEach(f => {
      console.log(`  - ${f.hospital}: ${f.error}`);
    });
  }

  // Save log
  const logPath = path.join(outputDir, 'download_log.csv');
  const logContent = [
    'hospital,url,success,filename,size,error',
    ...results.map(r =>
      `"${r.hospital}","${r.url}",${r.success},"${r.filename}",${r.size},"${r.error}"`
    )
  ].join('\n');
  fs.writeFileSync(logPath, logContent);
  console.log(`\nDownload log saved to: ${logPath}`);

  // List files by region
  console.log('\nFiles by region:');
  const regions = fs.readdirSync(outputDir).filter(f =>
    fs.statSync(path.join(outputDir, f)).isDirectory()
  );

  for (const region of regions.sort()) {
    const regionPath = path.join(outputDir, region);
    const files = fs.readdirSync(regionPath).filter(f => !f.startsWith('.'));
    if (files.length > 0) {
      console.log(`\n  ${region}/`);
      for (const file of files.sort()) {
        const stats = fs.statSync(path.join(regionPath, file));
        console.log(`    - ${file} (${stats.size.toLocaleString()} bytes)`);
      }
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
