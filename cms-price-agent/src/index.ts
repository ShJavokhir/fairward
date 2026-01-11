#!/usr/bin/env node

import { Command } from 'commander';
import prompts from 'prompts';
import ora from 'ora';
import chalk from 'chalk';
import { config as dotenvConfig } from 'dotenv';
import { CMSPriceScraperAgent } from './agents/price-scraper-agent.js';
import { logger, LogLevel } from './utils/logger.js';
import { ensureDirectory, listFiles } from './utils/file-ops.js';
import { resolve } from 'path';
import { readFile } from 'fs/promises';

// Load environment variables
dotenvConfig();

const program = new Command();

program
  .name('cms-price-agent')
  .description('Autonomous agent for discovering and downloading CMS hospital price transparency files')
  .version('1.0.0');

program
  .command('search')
  .description('Search for and download price transparency files for a hospital')
  .option('-n, --name <name>', 'Hospital name to search for')
  .option('-o, --output <dir>', 'Output directory', '../public_prices')
  .option('-v, --verbose', 'Enable verbose output', false)
  .option('--no-download', 'Only discover files, do not download')
  .action(async (options) => {
    await runAgent(options);
  });

program
  .command('interactive')
  .description('Interactive mode - prompts for hospital name')
  .action(async () => {
    await runInteractive();
  });

program
  .command('list')
  .description('List downloaded files')
  .option('-o, --output <dir>', 'Output directory', '../public_prices')
  .action(async (options) => {
    await listDownloads(options.output);
  });

program
  .command('check-setup')
  .description('Verify agent setup and dependencies')
  .action(async () => {
    await checkSetup();
  });

/**
 * Run the agent with provided options
 */
async function runAgent(options: {
  name?: string;
  output: string;
  verbose: boolean;
  download?: boolean;
}): Promise<void> {
  if (options.verbose) {
    logger.setLevel(LogLevel.DEBUG);
  }

  // Get hospital name
  let hospitalName = options.name;
  if (!hospitalName) {
    const response = await prompts({
      type: 'text',
      name: 'hospitalName',
      message: 'Enter hospital name to search:',
      validate: (value) => value.length > 0 || 'Hospital name is required',
    });

    if (!response.hospitalName) {
      logger.error('Hospital name is required');
      process.exit(1);
    }

    hospitalName = response.hospitalName;
  }

  // Validate environment
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.error('ANTHROPIC_API_KEY environment variable is required');
    logger.info('Set it with: export ANTHROPIC_API_KEY=your-key');
    process.exit(1);
  }

  // Create and run agent
  const agent = new CMSPriceScraperAgent(hospitalName, {
    outputDir: options.output,
    verbose: options.verbose,
  });

  const spinner = ora({
    text: `Searching for price transparency files for "${hospitalName}"...`,
    color: 'cyan',
  });

  try {
    spinner.start();

    // Discover files
    const files = await agent.discoverFiles();
    spinner.succeed(`Found ${files.length} potential file(s)`);

    if (files.length === 0) {
      logger.warn('No machine-readable price files found');
      logger.info('This could mean:');
      logger.info('  - The hospital uses a different name or branding');
      logger.info('  - Files are hosted on a third-party platform');
      logger.info('  - The hospital may not be compliant with CMS requirements');
      return;
    }

    // Show discovered files
    console.log('\n' + chalk.bold('Discovered Files:'));
    files.forEach((file, i) => {
      console.log(chalk.cyan(`  ${i + 1}. ${file.fileName}`));
      console.log(chalk.gray(`     Type: ${file.fileType}`));
      console.log(chalk.gray(`     URL: ${file.url.substring(0, 80)}...`));
    });

    // Download files if requested
    if (options.download !== false) {
      console.log('');
      const confirm = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: `Download ${files.length} file(s)?`,
        initial: true,
      });

      if (confirm.proceed) {
        spinner.text = 'Downloading files...';
        spinner.start();

        const results = await agent.downloadFiles();
        const successCount = results.filter(r => r.success).length;

        if (successCount === results.length) {
          spinner.succeed(`Downloaded all ${successCount} file(s) successfully`);
        } else {
          spinner.warn(`Downloaded ${successCount}/${results.length} file(s)`);
        }

        // Show results
        console.log('\n' + chalk.bold('Download Results:'));
        results.forEach((result, i) => {
          const status = result.success ? chalk.green('✓') : chalk.red('✗');
          const info = result.success
            ? chalk.gray(`${result.filePath}`)
            : chalk.red(`Error: ${result.error}`);
          console.log(`  ${status} ${info}`);
        });
      }
    }

    // Show final state
    const state = agent.getState();
    console.log('\n' + chalk.bold('Summary:'));
    console.log(chalk.gray(`  Session ID: ${state.sessionId}`));
    console.log(chalk.gray(`  Status: ${state.status}`));
    console.log(chalk.gray(`  Files discovered: ${state.discoveredFiles.length}`));
    console.log(chalk.gray(`  Files downloaded: ${state.downloadedFiles.filter(d => d.success).length}`));
    if (state.errors.length > 0) {
      console.log(chalk.yellow(`  Errors: ${state.errors.length}`));
    }
  } catch (error) {
    spinner.fail('Agent failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Interactive mode
 */
async function runInteractive(): Promise<void> {
  console.log(chalk.magenta.bold('\n  CMS Hospital Price Transparency File Agent\n'));
  console.log(chalk.gray('  This agent will search for and download machine-readable'));
  console.log(chalk.gray('  price transparency files required by CMS regulations.\n'));

  const response = await prompts([
    {
      type: 'text',
      name: 'hospitalName',
      message: 'Hospital name:',
      validate: (value) => value.length > 0 || 'Hospital name is required',
    },
    {
      type: 'confirm',
      name: 'download',
      message: 'Download files after discovery?',
      initial: true,
    },
    {
      type: 'confirm',
      name: 'verbose',
      message: 'Enable verbose logging?',
      initial: false,
    },
  ]);

  if (!response.hospitalName) {
    logger.error('Cancelled');
    process.exit(0);
  }

  await runAgent({
    name: response.hospitalName,
    output: '../public_prices',
    verbose: response.verbose,
    download: response.download,
  });
}

/**
 * List downloaded files
 */
async function listDownloads(outputDir: string): Promise<void> {
  const resolvedDir = resolve(process.cwd(), outputDir);

  try {
    const files = await listFiles(resolvedDir);

    if (files.length === 0) {
      logger.info('No downloaded files found');
      return;
    }

    console.log(chalk.bold(`\nDownloaded Files (${resolvedDir}):\n`));
    files.forEach((file) => {
      console.log(chalk.cyan(`  - ${file}`));
    });
    console.log('');
  } catch {
    logger.info('Output directory does not exist yet');
  }
}

/**
 * Check agent setup
 */
async function checkSetup(): Promise<void> {
  console.log(chalk.bold('\nChecking Agent Setup...\n'));

  const checks = [
    {
      name: 'ANTHROPIC_API_KEY',
      check: () => !!process.env.ANTHROPIC_API_KEY,
      fix: 'Set ANTHROPIC_API_KEY environment variable',
    },
    {
      name: 'Claude CLI',
      check: async () => {
        const { execSync } = await import('child_process');
        try {
          execSync('which claude', { stdio: 'pipe' });
          return true;
        } catch {
          return false;
        }
      },
      fix: 'Install Claude Code: npm install -g @anthropic-ai/claude-code',
    },
    {
      name: 'MCP Config',
      check: async () => {
        try {
          await readFile(resolve(process.cwd(), 'mcp-config.json'), 'utf-8');
          return true;
        } catch {
          return false;
        }
      },
      fix: 'Create mcp-config.json with Firecrawl configuration',
    },
    {
      name: 'FIRECRAWL_API_KEY',
      check: () => !!process.env.FIRECRAWL_API_KEY,
      fix: 'Set FIRECRAWL_API_KEY environment variable (get one at firecrawl.dev)',
    },
  ];

  let allPassed = true;

  for (const check of checks) {
    const result = await (typeof check.check === 'function' ? check.check() : check.check);
    const status = result ? chalk.green('✓') : chalk.red('✗');
    console.log(`  ${status} ${check.name}`);
    if (!result) {
      console.log(chalk.gray(`    → ${check.fix}`));
      allPassed = false;
    }
  }

  console.log('');

  if (allPassed) {
    console.log(chalk.green('All checks passed! Agent is ready to use.\n'));
  } else {
    console.log(chalk.yellow('Some checks failed. Please fix the issues above.\n'));
  }
}

// Parse CLI arguments
program.parse();

// If no command provided, run interactive mode
if (!process.argv.slice(2).length) {
  runInteractive();
}
