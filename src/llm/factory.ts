import * as vscode from 'vscode';
import { ILLMProvider, LLMProviderType } from './types';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';
import { ClaudeProvider } from './providers/claude';
import { LocalProvider } from './providers/local';
import { OllamaProvider } from './providers/ollama';
import { OpenAICompatProvider } from './providers/openaiCompat';

export async function createLLMProvider(): Promise<ILLMProvider> {
  const config = vscode.workspace.getConfiguration('mindexai');
  const providerType = config.get<LLMProviderType>('llmProvider', 'openai');

  if (providerType === 'local') {
    const baseUrl  = config.get<string>('localBaseUrl', 'http://localhost:11434/v1');
    const model    = config.get<string>('localModel', '');
    const apiType  = config.get<string>('localApiType', 'openai-compat');
    if (!model) {
      throw new Error(
        'No local model name configured. ' +
        'Run "MindexAI: Configure LLM Provider" and enter the model name (e.g. mistral, llama3).'
      );
    }
    if (apiType === 'ollama') {
      return new OllamaProvider(baseUrl, model);
    }
    // API key is optional for local servers — fall back to a placeholder
    const apiKey = (await getStoredApiKey('local')) ?? 'local';
    return new LocalProvider(baseUrl, model, apiKey);
  }

  if (providerType === 'openai-compat') {
    const baseUrl = config.get<string>('openaiCompatBaseUrl', '');
    const model   = config.get<string>('openaiCompatModel', '');
    if (!baseUrl) {
      throw new Error(
        'No base URL configured for OpenAI-compatible server. ' +
        'Run "MindexAI: Configure LLM Provider" and enter the server URL.'
      );
    }
    if (!model) {
      throw new Error(
        'No model name configured for OpenAI-compatible server. ' +
        'Run "MindexAI: Configure LLM Provider" and enter the model name.'
      );
    }
    // API key is optional — many self-hosted servers accept any value
    const apiKey = (await getStoredApiKey('openai-compat')) ?? 'no-key';
    return new OpenAICompatProvider(baseUrl, model, apiKey);
  }

  const apiKey = await getStoredApiKey(providerType);
  if (!apiKey) {
    throw new Error(
      `No API key configured for ${providerType}. ` +
      'Run "MindexAI: Configure LLM Provider" to set up your API key.'
    );
  }

  switch (providerType) {
    case 'openai': {
      const model = config.get<string>('openaiModel', 'gpt-4o');
      return new OpenAIProvider(apiKey, model);
    }
    case 'gemini': {
      const model = config.get<string>('geminiModel', 'gemini-2.5-flash');
      return new GeminiProvider(apiKey, model);
    }
    case 'claude': {
      const model = config.get<string>('claudeModel', 'claude-opus-4-6');
      return new ClaudeProvider(apiKey, model);
    }
    default:
      throw new Error(`Unknown LLM provider: ${providerType}`);
  }
}

export async function getStoredApiKey(provider: LLMProviderType): Promise<string | undefined> {
  return _secretStorage?.get(`mindexai.apiKey.${provider}`);
}

export async function storeApiKey(provider: LLMProviderType, apiKey: string): Promise<void> {
  await _secretStorage?.store(`mindexai.apiKey.${provider}`, apiKey);
}

export async function deleteApiKey(provider: LLMProviderType): Promise<void> {
  await _secretStorage?.delete(`mindexai.apiKey.${provider}`);
}

let _secretStorage: vscode.SecretStorage | undefined;

export function initializeSecretStorage(storage: vscode.SecretStorage): void {
  _secretStorage = storage;
}

export async function hasApiKey(provider: LLMProviderType): Promise<boolean> {
  if (provider === 'local') {
    // Local is ready when a model name is set — no key required
    const model = vscode.workspace.getConfiguration('mindexai').get<string>('localModel', '');
    return model.trim().length > 0;
  }
  if (provider === 'openai-compat') {
    // Remote OpenAI-compatible server is ready when base URL and model are set
    const cfg = vscode.workspace.getConfiguration('mindexai');
    const url   = cfg.get<string>('openaiCompatBaseUrl', '');
    const model = cfg.get<string>('openaiCompatModel', '');
    return url.trim().length > 0 && model.trim().length > 0;
  }
  const key = await getStoredApiKey(provider);
  return !!key && key.length > 0;
}
