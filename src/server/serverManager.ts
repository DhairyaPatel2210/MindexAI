import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface ServerOptions {
  modelPath: string;
  port: number;
  gpuLayers: number;
  contextSize: number;
  binaryPath?: string; // override auto-detected llama-server path
}

export interface ServerState {
  status: ServerStatus;
  port: number;
  modelName: string;
  logLine?: string; // latest log line for live display
}

type StatusCallback = (state: ServerState) => void;

/**
 * Manages a llama-server (llama.cpp) child process.
 * Singleton — only one server runs at a time.
 */
export class ServerManager {
  private proc: cp.ChildProcess | null = null;
  private _status: ServerStatus = 'stopped';
  private _port = 8080;
  private _modelName = '';
  private _logs: string[] = [];
  private healthTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: Set<StatusCallback> = new Set();

  // ── Public API ──────────────────────────────────────────────────────────────

  get status(): ServerStatus {
    return this._status;
  }
  get port(): number {
    return this._port;
  }
  get isRunning(): boolean {
    return this._status === 'running';
  }

  /** Returns the last N log lines captured from the server process. */
  get recentLogs(): string[] {
    return this._logs.slice(-80);
  }

  onStatusChange(cb: StatusCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  async start(options: ServerOptions): Promise<void> {
    if (this.proc) {
      await this.stop();
    }

    if (!fs.existsSync(options.modelPath)) {
      this.emit(
        'error',
        options.port,
        options.modelPath,
        `Model file not found: ${options.modelPath}`,
      );
      return;
    }

    const binary = options.binaryPath || (await detectBinary());
    if (!binary) {
      this.emit(
        'error',
        options.port,
        options.modelPath,
        'llama-server binary not found. Install llama.cpp (brew install llama.cpp) or set the binary path manually.',
      );
      return;
    }

    this._port = options.port;
    this._modelName = path.basename(options.modelPath);
    this._logs = [];
    this.emit(
      'starting',
      options.port,
      this._modelName,
      `Launching ${path.basename(binary)} with ${this._modelName}…`,
    );

    const args = [
      '-m',
      options.modelPath,
      '--port',
      String(options.port),
      '--host',
      '127.0.0.1',
      '-ngl',
      String(options.gpuLayers),
      '-c',
      String(options.contextSize),
      '--parallel',
      '1',
      '--batch-size',
      '1024',
      '--cont-batching',
    ];

    logger.info(`Starting llama-server: ${binary} ${args.join(' ')}`);

    this.proc = cp.spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const onData = (data: Buffer) => {
      const lines = data
        .toString()
        .split('\n')
        .filter(l => l.trim());
      for (const line of lines) {
        this.addLog(line);
        if (
          /listening|server\s+start|HTTP server|all slots are idle/i.test(line)
        ) {
          if (this._status !== 'running') {
            this.emit(
              'running',
              this._port,
              this._modelName,
              `Server ready on port ${this._port}`,
            );
          }
        }
        if (/error|failed|abort/i.test(line) && this._status === 'starting') {
          this.emit('error', this._port, this._modelName, line);
        }
      }
    };

    this.proc.stdout?.on('data', onData);
    this.proc.stderr?.on('data', onData);

    this.proc.on('exit', (code, signal) => {
      this.proc = null;
      if (this.healthTimer) {
        clearTimeout(this.healthTimer);
        this.healthTimer = null;
      }
      const wasRunning = this._status === 'running';
      const msg = signal
        ? `Server killed (${signal})`
        : `Server exited (code ${code})`;
      this.emit(
        code === 0 || signal === 'SIGTERM' ? 'stopped' : 'error',
        this._port,
        this._modelName,
        msg,
      );
      if (!wasRunning) {
        logger.warn(msg);
      }
    });

    this.proc.on('error', (err) => {
      this.proc = null;
      this.emit(
        'error',
        this._port,
        this._modelName,
        `Spawn error: ${err.message}`,
      );
    });

    // Fallback: poll HTTP health endpoint in case the log line is missed
    this.pollHealth(options.port);
  }

  async stop(): Promise<void> {
    if (this.healthTimer) {
      clearTimeout(this.healthTimer);
      this.healthTimer = null;
    }
    if (!this.proc) {
      this.emit('stopped', this._port, this._modelName, 'Server stopped.');
      return;
    }
    this.proc.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        this.proc?.kill('SIGKILL');
        resolve();
      }, 3000);
      this.proc!.once('exit', () => {
        clearTimeout(t);
        resolve();
      });
    });
    this.proc = null;
    this.emit('stopped', this._port, this._modelName, 'Server stopped.');
  }

  dispose(): void {
    this.proc?.kill('SIGKILL');
    this.proc = null;
    if (this.healthTimer) {
      clearTimeout(this.healthTimer);
    }
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private pollHealth(port: number): void {
    let attempts = 0;
    const MAX = 120; // 2 minutes

    const check = async () => {
      if (
        this._status === 'running' ||
        this._status === 'stopped' ||
        this._status === 'error'
      ) {
        return;
      }
      attempts++;
      try {
        const r = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(2000),
        });
        if (r.ok || r.status === 503 /* loading */) {
          if (r.ok) {
            this.emit(
              'running',
              port,
              this._modelName,
              `Server ready on port ${port}`,
            );
            return;
          }
        }
      } catch {
        /* not ready */
      }

      if (attempts < MAX && this._status === 'starting') {
        this.healthTimer = setTimeout(check, 1000);
      }
    };

    this.healthTimer = setTimeout(check, 2000);
  }

  private addLog(line: string): void {
    this._logs.push(line);
    if (this._logs.length > 200) {
      this._logs.shift();
    }
    this.callbacks.forEach(cb =>
      cb({
        status: this._status,
        port: this._port,
        modelName: this._modelName,
        logLine: line,
      }),
    );
  }

  private emit(
    status: ServerStatus,
    port: number,
    modelName: string,
    logLine?: string,
  ): void {
    this._status = status;
    if (logLine) {
      this._logs.push(`[${status}] ${logLine}`);
    }
    logger.info(`ServerManager: ${status}${logLine ? ' — ' + logLine : ''}`);
    this.callbacks.forEach(cb => cb({ status, port, modelName, logLine }));
  }
}

// ── Binary detection ──────────────────────────────────────────────────────────

export async function detectBinary(): Promise<string | null> {
  const candidates = [
    'llama-server',
    'llama_server',
    '/opt/homebrew/bin/llama-server',
    '/usr/local/bin/llama-server',
    '/usr/bin/llama-server',
  ];

  for (const bin of candidates) {
    if (await commandExists(bin)) {
      return bin;
    }
  }
  return null;
}

function commandExists(bin: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = bin.startsWith('/') ? `test -x "${bin}"` : `which "${bin}"`;
    cp.exec(cmd, { timeout: 3000 }, (err) => resolve(!err));
  });
}

// ── Global singleton ──────────────────────────────────────────────────────────

export const serverManager = new ServerManager();
