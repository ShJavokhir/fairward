import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4,
}

interface LoggerConfig {
  level: LogLevel;
  showTimestamp: boolean;
  prefix: string;
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  showTimestamp: true,
  prefix: 'CMS-Agent',
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = this.config.showTimestamp ? `[${this.getTimestamp()}]` : '';
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
    return `${timestamp}${prefix}[${level}] ${message}${dataStr}`;
  }

  debug(message: string, data?: unknown): void {
    if (this.config.level <= LogLevel.DEBUG) {
      console.log(chalk.gray(this.formatMessage('DEBUG', message, data)));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.config.level <= LogLevel.INFO) {
      console.log(chalk.blue(this.formatMessage('INFO', message, data)));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.config.level <= LogLevel.WARN) {
      console.log(chalk.yellow(this.formatMessage('WARN', message, data)));
    }
  }

  error(message: string, data?: unknown): void {
    if (this.config.level <= LogLevel.ERROR) {
      console.error(chalk.red(this.formatMessage('ERROR', message, data)));
    }
  }

  success(message: string, data?: unknown): void {
    console.log(chalk.green(this.formatMessage('SUCCESS', message, data)));
  }

  step(step: number, total: number, message: string): void {
    console.log(chalk.cyan(`\n[Step ${step}/${total}] ${message}`));
  }

  divider(): void {
    console.log(chalk.gray('─'.repeat(60)));
  }

  banner(title: string): void {
    const line = '═'.repeat(60);
    console.log(chalk.magenta(`\n${line}`));
    console.log(chalk.magenta.bold(`  ${title}`));
    console.log(chalk.magenta(`${line}\n`));
  }

  table(data: Record<string, unknown>[]): void {
    if (data.length === 0) return;
    console.table(data);
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}

export const logger = new Logger();
export { Logger };
