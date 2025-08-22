// utils/providers/bedrock.ts

import {
  ProviderService,
  CompletionResult,
  registerProviderService,
} from '../providerService';

import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

function parseAwsCreds(key: string): {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
} {
  try {
    const obj = JSON.parse(key);
    if (obj.accessKeyId && obj.secretAccessKey && obj.region) return obj;
  } catch {}
  const parts = key.split('|');
  if (parts.length >= 3) {
    const [accessKeyId, secretAccessKey, region, sessionToken] = parts;
    return { accessKeyId, secretAccessKey, region, sessionToken };
  }
  // fallback colon-delimited
  const parts2 = key.split(':');
  if (parts2.length >= 3) {
    const [accessKeyId, secretAccessKey, region, sessionToken] = parts2;
    return { accessKeyId, secretAccessKey, region, sessionToken };
  }
  throw new Error('Invalid AWS credentials format. Use JSON or "ACCESS|SECRET|REGION|[SESSION]"');
}

const bedrockService: ProviderService = {
  providerId: 'bedrock',

  async getModels(apiKey: string): Promise<string[]> {
    const { accessKeyId, secretAccessKey, region, sessionToken } = parseAwsCreds(apiKey);
    const client = new BedrockClient({
      region,
      credentials: { accessKeyId, secretAccessKey, sessionToken },
    });
    const cmd = new ListFoundationModelsCommand({ byOutputModality: 'TEXT' });
    const resp = await client.send(cmd);
    const list = resp.modelSummaries || [];
    return list.map((m: any) => m.modelId).filter(Boolean);
  },

  async *generate(
    prompt: string,
    model: string,
    apiKey: string,
    signal?: AbortSignal
  ): AsyncGenerator<CompletionResult> {
    const startTime = Date.now();
    let firstTokenTime: number | undefined;
    let tokenCount = 0;

    const { accessKeyId, secretAccessKey, region, sessionToken } = parseAwsCreds(apiKey);
    const runtime = new BedrockRuntimeClient({
      region,
      credentials: { accessKeyId, secretAccessKey, sessionToken },
    });

    // Use Converse (non-streaming) for simplicity. We will yield one chunk.
    const cmd = new ConverseCommand({
      modelId: model,
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: { maxTokens: 4096, temperature: 0.7 },
    } as any);

    const out: any = await runtime.send(cmd);
    const text = out?.output?.message?.content?.[0]?.text || out?.outputMessage?.content?.[0]?.text || '';

    if (text) {
      firstTokenTime = Date.now();
      tokenCount = text.split(/\s+/).length; // rough heuristic
      yield { type: 'chunk', content: text };
    }

    const finishTime = Date.now();
    yield { type: 'metrics', data: { startTime, firstTokenTime, finishTime, tokenCount } };
  },
};

registerProviderService(bedrockService);
