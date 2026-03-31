import * as vscode from 'vscode';

class Logger {
  private outputChannel: vscode.OutputChannel;
  private _debugEnabled = false;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('CodeAtlas');
  }

  set debugEnabled(v: boolean) { this._debugEnabled = v; }
  get debugEnabled(): boolean { return this._debugEnabled; }

  private timestamp(): string { return new Date().toISOString(); }

  info(message: string): void {
    this.outputChannel.appendLine(`[${this.timestamp()}] INFO  ${message}`);
  }

  warn(message: string): void {
    this.outputChannel.appendLine(`[${this.timestamp()}] WARN  ${message}`);
  }

  error(message: string, error?: unknown): void {
    const detail = error instanceof Error
      ? `\n  ${error.message}${error.stack ? '\n' + error.stack : ''}`
      : error ? `\n  ${String(error)}` : '';
    this.outputChannel.appendLine(`[${this.timestamp()}] ERROR ${message}${detail}`);
  }

  debug(message: string): void {
    if (!this._debugEnabled) { return; }
    this.outputChannel.appendLine(`[${this.timestamp()}] DEBUG ${message}`);
  }

  section(title: string): void {
    this.outputChannel.appendLine(`\n${'─'.repeat(60)}`);
    this.outputChannel.appendLine(`  ${title}`);
    this.outputChannel.appendLine(`${'─'.repeat(60)}`);
  }

  show(): void { this.outputChannel.show(true); }
  dispose(): void { this.outputChannel.dispose(); }
}

export const logger = new Logger();
