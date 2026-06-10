export class Logger {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  info(message: string): void {
    console.log(message);
  }

  error(message: string): void {
    console.error(message);
  }

  success(message: string): void {
    console.log(message);
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(`[verbose] ${message}`);
    }
  }

  warn(message: string): void {
    console.warn(message);
  }

  timestamp(): string {
    return new Date().toISOString();
  }
}
