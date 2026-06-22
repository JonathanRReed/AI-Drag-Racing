import { ModelApiParams } from '../modelApi';

// Omit 'provider' from params for the handler as it's already resolved
export type ProviderParams = Omit<ModelApiParams, 'provider'>;

export interface ProviderResult {
  output: string | null;
  usage?: any;
  cost?: number | null;
  totalTokens?: number | null;
  error?: string;
}

export type ModelApiProviderHandler = (params: ProviderParams) => Promise<ProviderResult>;
