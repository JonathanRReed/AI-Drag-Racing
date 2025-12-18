// utils/providerService.ts

// Defines the standard metrics we want to collect for each response.
export interface CompletionMetrics {
  startTime: number;
  firstTokenTime?: number;
  finishTime: number;
  tokenCount: number; // total tokens (input + output)
  inputTokens?: number; // optional: input token estimate or provider-reported
  outputTokens?: number; // optional: output token estimate or provider-reported
}

// Defines the output of our streaming generator.
// It can yield either a chunk of text or the final metrics.
export type CompletionResult = {
  type: 'chunk';
  content: string;
} | {
  type: 'metrics';
  data: CompletionMetrics;
};

// Model settings that can be passed to providers
export interface ModelSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

// This is the core interface that every provider implementation must adhere to.
export interface ProviderService {
  // A unique identifier for the provider.
  providerId: string;

  // Fetches the list of available models for this provider.
  getModels(apiKey: string): Promise<string[]>;

  // Generates a completion for a given prompt, streaming the results back.
  generate(
    prompt: string,
    model: string,
    apiKey: string,
    signal?: AbortSignal,
    settings?: ModelSettings,
  ): AsyncGenerator<CompletionResult>;
}

// A simple factory or registry to get a provider service by its ID.
// For now, we will leave this empty and populate it as we implement each provider.
const providerRegistry: Map<string, ProviderService> = new Map();

export function getProviderService(providerId: string): ProviderService | undefined {
  return providerRegistry.get(providerId);
}

export function registerProviderService(service: ProviderService) {
  providerRegistry.set(service.providerId, service);
}
