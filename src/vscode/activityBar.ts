import * as vscode from 'vscode';
import { isWorkflowRunning } from '../core/workflow/runner';
import { loadUsageStats, getStatsDisplay, RunRecord } from '../core/stats/usageStats';
import { hasApiKey } from '../llm/factory';
import { LLMProviderType } from '../llm/types';

export class MindexAIActivityProvider implements vscode.TreeDataProvider<ActivityItem>, vscode.Disposable {
  private _onDidChangeTreeData = new vscode.EventEmitter<ActivityItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private disposables: vscode.Disposable[] = [];

  constructor() {
    // Refresh when configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('mindexai')) { this.refresh(); }
      })
    );
  }

  refresh(): void { this._onDidChangeTreeData.fire(); }

  getTreeItem(element: ActivityItem): vscode.TreeItem { return element; }

  async getChildren(element?: ActivityItem): Promise<ActivityItem[]> {
    if (!element) {
      return this.getRootItems();
    }
    return element.children ?? [];
  }

  private async getRootItems(): Promise<ActivityItem[]> {
    const items: ActivityItem[] = [];

    // ── Quick Actions ──────────────────────────────────────────────────────
    const running = isWorkflowRunning();

    if (running) {
      items.push(new ActivityItem(
        '$(loading~spin) Analysis Running…',
        'Click to cancel the running analysis',
        vscode.TreeItemCollapsibleState.None,
        { command: 'mindexai.cancelWorkflow', title: 'Cancel' },
        'running'
      ));
    } else {
      items.push(new ActivityItem(
        '$(play) Run Full Analysis',
        'Analyze entire codebase and build semantic index',
        vscode.TreeItemCollapsibleState.None,
        { command: 'mindexai.runWorkflow', title: 'Run' },
        'action-primary'
      ));
      items.push(new ActivityItem(
        '$(sync) Update Index',
        'Incremental update for changed files only',
        vscode.TreeItemCollapsibleState.None,
        { command: 'mindexai.updateIndex', title: 'Update' },
        'action'
      ));
      items.push(new ActivityItem(
        '$(file-code) Analyze Current File',
        'Analyze the currently open editor file',
        vscode.TreeItemCollapsibleState.None,
        { command: 'mindexai.analyzeFile', title: 'Analyze File' },
        'action'
      ));
    }

    items.push(new ActivityItem(
      '$(book) View Semantic Index',
      'Open the CONTEXT.md overview in preview',
      vscode.TreeItemCollapsibleState.None,
      { command: 'mindexai.showIndex', title: 'Show Index' },
      'action'
    ));

    // ── Separator ─────────────────────────────────────────────────────────
    items.push(new ActivityItem(
      '─── Configuration ───',
      '',
      vscode.TreeItemCollapsibleState.None,
      undefined,
      'separator'
    ));

    // ── Configuration ──────────────────────────────────────────────────────
    const config = vscode.workspace.getConfiguration('mindexai');
    const provider = config.get<LLMProviderType>('llmProvider', 'openai');
    let keySet = false;
    try {
      keySet = await hasApiKey(provider);
    } catch { /* workspace not ready */ }

    items.push(new ActivityItem(
      `$(gear) Configure`,
      `Provider: ${provider}${keySet ? ' ✓' : ' (not configured)'}`,
      vscode.TreeItemCollapsibleState.None,
      { command: 'mindexai.openSetup', title: 'Configure' },
      keySet ? 'config-ok' : 'config-warn'
    ));

    // ── Stats Summary ──────────────────────────────────────────────────────
    try {
      const stats = loadUsageStats();
      if (stats.global.workflowRuns > 0) {
        // Separator doubles as "show all runs" button
        items.push(new ActivityItem(
          '─── Statistics ───',
          'Click to view all run history',
          vscode.TreeItemCollapsibleState.None,
          { command: 'mindexai.showStats', title: 'All Stats' },
          'separator'
        ));

        // Last 5 runs (most recent first)
        const recentRuns = (stats.runHistory ?? []).slice(-5).reverse();
        if (recentRuns.length > 0) {
          for (const run of recentRuns) {
            items.push(ActivityItem.fromRun(run));
          }
        } else {
          // Fallback: show cumulative per-provider totals for old data without run history
          const display = getStatsDisplay(stats);
          for (const p of display.providers) {
            const totalK = (p.totalTokens / 1000).toFixed(1);
            items.push(new ActivityItem(
              `$(pulse) ${p.name}: ${totalK}K tokens`,
              `${p.requestCount} requests · avg ${p.avgInputTokensPerRun.toLocaleString()} in / ${p.avgOutputTokensPerRun.toLocaleString()} out per run`,
              vscode.TreeItemCollapsibleState.None,
              { command: 'mindexai.showStats', title: 'Stats' },
              'stats-detail'
            ));
          }
        }
      }
    } catch {
      // Stats not available yet
    }

    return items;
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}

class ActivityItem extends vscode.TreeItem {
  children?: ActivityItem[];

  constructor(
    label: string,
    tooltip: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    command?: vscode.Command,
    contextValue?: string
  ) {
    // Extract $(iconName) prefix — codicons are NOT rendered in tree item labels;
    // they must be set via iconPath = new vscode.ThemeIcon(name).
    const iconMatch = label.match(/^\$\(([^)]+)\)\s*/);
    const cleanLabel = iconMatch ? label.slice(iconMatch[0].length) : label;
    super(cleanLabel, collapsibleState);
    if (iconMatch) {
      this.iconPath = new vscode.ThemeIcon(iconMatch[1]);
    }
    this.tooltip = tooltip;
    this.command = command;
    this.contextValue = contextValue;
  }

  /** Build a tree item from a RunRecord for the sidebar. */
  static fromRun(run: RunRecord): ActivityItem {
    const date = new Date(run.timestamp);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const inK  = (run.inputTokens  / 1000).toFixed(1);
    const outK = (run.outputTokens / 1000).toFixed(1);
    const label = `$(history) ${dateStr} ${timeStr} · ${inK}K/${outK}K tokens`;
    const tooltip =
      `${run.provider} · ${run.filesAnalyzed} files analyzed` +
      (run.filesFromCache > 0 ? ` (${run.filesFromCache} cached)` : '') +
      ` · ${Math.round(run.durationMs / 1000)}s` +
      (run.errors > 0 ? ` · ${run.errors} errors` : '');
    return new ActivityItem(
      label,
      tooltip,
      vscode.TreeItemCollapsibleState.None,
      { command: 'mindexai.showStats', title: 'Stats' },
      'stats-run'
    );
  }
}
