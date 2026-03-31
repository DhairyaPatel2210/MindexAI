import * as vscode from 'vscode';
import { isWorkflowRunning } from '../core/workflow/runner';

export class CodeAtlasStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.name = 'CodeAtlas';
    this.setIdle();
    this.item.show();
  }

  setIdle(): void {
    this.item.text = '$(circuit-board) CodeAtlas';
    this.item.tooltip = 'CodeAtlas: Run full semantic analysis';
    this.item.command = 'codeatlas.runWorkflow';
    this.item.backgroundColor = undefined;
    this.item.color = undefined;
  }

  setRunning(): void {
    this.item.text = '$(loading~spin) CodeAtlas';
    this.item.tooltip = 'CodeAtlas: Analysis running… Click to cancel';
    this.item.command = 'codeatlas.cancelWorkflow';
    this.item.color = new vscode.ThemeColor('statusBarItem.warningForeground');
  }

  setError(): void {
    this.item.text = '$(error) CodeAtlas';
    this.item.tooltip = 'CodeAtlas: Last analysis had errors. Click to re-run.';
    this.item.command = 'codeatlas.runWorkflow';
    this.item.color = new vscode.ThemeColor('statusBarItem.errorForeground');

    // Reset to idle after 5s
    setTimeout(() => {
      if (!isWorkflowRunning()) {
        this.setIdle();
      }
    }, 5000);
  }

  setSuccess(filesAnalyzed: number, symbolsIndexed: number): void {
    this.item.text = `$(check) CodeAtlas (${filesAnalyzed}f / ${symbolsIndexed}s)`;
    this.item.tooltip =
      `CodeAtlas: Index up to date — ${filesAnalyzed} files, ${symbolsIndexed} symbols\nClick to re-run`;
    this.item.command = 'codeatlas.runWorkflow';
    this.item.color = new vscode.ThemeColor('statusBarItem.prominentForeground');

    // Reset after 10s
    setTimeout(() => {
      if (!isWorkflowRunning()) {
        this.setIdle();
      }
    }, 10000);
  }

  dispose(): void {
    this.item.dispose();
  }
}
