import { z } from 'zod';

/**
 * Schema for hospital search input
 */
export const HospitalSearchInputSchema = z.object({
  hospitalName: z.string().min(1, 'Hospital name is required'),
  state: z.string().optional(),
  city: z.string().optional(),
});

export type HospitalSearchInput = z.infer<typeof HospitalSearchInputSchema>;

/**
 * Schema for discovered price file
 */
export const PriceFileSchema = z.object({
  url: z.string().url(),
  fileName: z.string(),
  fileType: z.enum(['json', 'csv', 'xml', 'xlsx', 'txt', 'other']),
  hospitalName: z.string(),
  hospitalId: z.string().optional(),
  discoveredAt: z.string().datetime(),
  fileSize: z.number().optional(),
  description: z.string().optional(),
});

export type PriceFile = z.infer<typeof PriceFileSchema>;

/**
 * Schema for download result
 */
export const DownloadResultSchema = z.object({
  success: z.boolean(),
  filePath: z.string().optional(),
  url: z.string(),
  error: z.string().optional(),
  bytesDownloaded: z.number().optional(),
  durationMs: z.number(),
});

export type DownloadResult = z.infer<typeof DownloadResultSchema>;

/**
 * Schema for agent session state
 */
export const AgentStateSchema = z.object({
  sessionId: z.string(),
  hospitalName: z.string(),
  status: z.enum(['searching', 'analyzing', 'downloading', 'completed', 'failed']),
  discoveredFiles: z.array(PriceFileSchema),
  downloadedFiles: z.array(DownloadResultSchema),
  errors: z.array(z.string()),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

/**
 * CMS Machine-Readable File patterns
 * These are the standard naming conventions for hospital price transparency files
 */
export const CMS_FILE_PATTERNS = {
  // Standard CMS naming patterns
  standardPatterns: [
    '*_standardcharges_*',
    '*-standardcharges-*',
    '*standard_charges*',
    '*standard-charges*',
    '*machine_readable*',
    '*machine-readable*',
    '*price_transparency*',
    '*price-transparency*',
    '*chargemaster*',
    '*cdm*',
  ],

  // Common file extensions for machine-readable files
  validExtensions: ['.json', '.csv', '.xml', '.xlsx', '.xls', '.txt'],

  // Keywords to look for in URLs and filenames
  keywords: [
    'standardcharges',
    'standard_charges',
    'machine-readable',
    'machine_readable',
    'price_transparency',
    'price-transparency',
    'chargemaster',
    'cdm',
    'pricelist',
    'price_list',
    'shoppable',
    'mrf', // Machine Readable File
  ],
} as const;

/**
 * Agent configuration
 */
export interface AgentConfig {
  maxRetries: number;
  downloadTimeout: number;
  outputDir: string;
  verbose: boolean;
  maxConcurrentDownloads: number;
  userAgent: string;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxRetries: 3,
  downloadTimeout: 300000, // 5 minutes
  outputDir: '../public_prices',
  verbose: true,
  maxConcurrentDownloads: 2,
  userAgent: 'CMS-Price-Transparency-Agent/1.0',
};
