// pages/api/providers/[providerId]/completions.ts

export const config = { runtime: 'edge' };

import { getProviderService } from '../../../../utils/providerService';
// Side-effect imports to register provider services (exclude Bedrock for Edge)
import '../../../../utils/providers/openai';
import '../../../../utils/providers/groq';
import '../../../../utils/providers/anthropic';
import '../../../../utils/providers/google';
import '../../../../utils/providers/cohere';
import '../../../../utils/providers/mistral';
import '../../../../utils/providers/together';
import '../../../../utils/providers/fireworks';
import '../../../../utils/providers/openrouter';
import '../../../../utils/providers/cerebras';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const match = url.pathname.match(/\/api\/providers\/([^/]+)\/completions/);
  const providerId = match?.[1];

  if (!providerId) {
    return new Response(JSON.stringify({ error: 'Invalid provider ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { prompt, model, apiKey, settings } = body || {};

  if (!prompt || !model || !apiKey) {
    return new Response(JSON.stringify({ error: 'Missing prompt, model, or apiKey' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extract model settings with defaults
  const modelSettings = {
    temperature: settings?.temperature ?? 0.7,
    maxTokens: settings?.maxTokens ?? 2048,
    topP: settings?.topP ?? 1.0,
  };

  const providerService = getProviderService(providerId);

  if (!providerService) {
    return new Response(JSON.stringify({ error: `Provider '${providerId}' not found` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const signal = (req as any).signal as AbortSignal | undefined;
  let aborted = false;
  signal?.addEventListener('abort', () => {
    aborted = true;
    try { writer.abort(); } catch {}
  });

  const writeEvent = async (data: any) => {
    if (aborted) return;
    const chunk = `data: ${JSON.stringify(data)}\n\n`;
    try {
      await writer.write(encoder.encode(chunk));
    } catch {
      // Ignore writes after stream has been closed/aborted
    }
  };

  (async () => {
    try {
      const generator = providerService.generate(prompt, model, apiKey, signal, modelSettings);
      for await (const result of generator) {
        if (aborted) break;
        await writeEvent(result);
      }
    } catch (error) {
      // Emit error to client unless already aborted
      if (!aborted) {
        const message = (error instanceof Error) ? error.message : String(error);
        try { await writeEvent({ type: 'error', message }); } catch {}
      }
    } finally {
      try { await writer.close(); } catch {}
      try { writer.releaseLock(); } catch {}
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
