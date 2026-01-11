import { mkdir, writeFile, access, readdir, stat, unlink } from 'fs/promises';
import { join, basename, extname } from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { logger } from './logger.js';
import type { DownloadResult, PriceFile } from '../types/index.js';

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await access(dirPath);
  } catch {
    await mkdir(dirPath, { recursive: true });
    logger.debug(`Created directory: ${dirPath}`);
  }
}

/**
 * Generate a safe filename from hospital name and original filename
 */
export function generateSafeFilename(hospitalName: string, originalUrl: string): string {
  // Extract filename from URL
  const urlPath = new URL(originalUrl).pathname;
  const originalFilename = basename(urlPath) || 'price_file';
  const ext = extname(originalFilename) || '.json';

  // Sanitize hospital name
  const safeHospitalName = hospitalName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);

  // Create timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  // Combine
  return `${safeHospitalName}_${timestamp}${ext}`;
}

/**
 * Download a file from URL to local path
 */
export async function downloadFile(
  url: string,
  outputDir: string,
  hospitalName: string,
  timeout: number = 300000
): Promise<DownloadResult> {
  const startTime = Date.now();

  try {
    await ensureDirectory(outputDir);

    const filename = generateSafeFilename(hospitalName, url);
    const filePath = join(outputDir, filename);

    logger.info(`Downloading: ${url}`);
    logger.debug(`Saving to: ${filePath}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'CMS-Price-Transparency-Agent/1.0 (Healthcare Price Research)',
          'Accept': '*/*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : undefined;

      if (totalBytes) {
        logger.info(`File size: ${formatBytes(totalBytes)}`);
      }

      // Stream to file
      const fileStream = createWriteStream(filePath);
      const readable = Readable.fromWeb(response.body as never);
      await pipeline(readable, fileStream);

      // Get actual file size
      const stats = await stat(filePath);

      clearTimeout(timeoutId);

      logger.success(`Downloaded: ${filename} (${formatBytes(stats.size)})`);

      return {
        success: true,
        filePath,
        url,
        bytesDownloaded: stats.size,
        durationMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Download failed: ${errorMessage}`);

    return {
      success: false,
      url,
      error: errorMessage,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * List files in directory
 */
export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.filter(e => e.isFile()).map(e => e.name);
  } catch {
    return [];
  }
}

/**
 * Save metadata JSON for downloaded files
 */
export async function saveMetadata(
  outputDir: string,
  hospitalName: string,
  files: PriceFile[],
  downloads: DownloadResult[]
): Promise<void> {
  const metadata = {
    hospitalName,
    scrapedAt: new Date().toISOString(),
    filesDiscovered: files.length,
    filesDownloaded: downloads.filter(d => d.success).length,
    files: files.map(f => ({
      ...f,
      downloaded: downloads.find(d => d.url === f.url)?.success ?? false,
      localPath: downloads.find(d => d.url === f.url)?.filePath,
    })),
  };

  const metadataPath = join(outputDir, `${hospitalName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_metadata.json`);
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  logger.info(`Metadata saved: ${metadataPath}`);
}

/**
 * Clean up partial/failed downloads
 */
export async function cleanupPartialDownloads(outputDir: string): Promise<void> {
  try {
    const files = await readdir(outputDir);
    for (const file of files) {
      if (file.endsWith('.partial') || file.endsWith('.tmp')) {
        const filePath = join(outputDir, file);
        await unlink(filePath);
        logger.debug(`Cleaned up: ${file}`);
      }
    }
  } catch {
    // Directory might not exist yet
  }
}
