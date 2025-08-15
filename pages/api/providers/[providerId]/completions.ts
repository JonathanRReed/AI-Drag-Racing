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

  const { prompt, model, apiKey } = body || {};

  if (!prompt || !model || !apiKey) {
    return new Response(JSON.stringify({ error: 'Missing prompt, model, or apiKey' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

  const writeEvent = async (data: any) => {
    const chunk = `data: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(chunk));
  };

  (async () => {
    try {
      const generator = providerService.generate(prompt, model, apiKey);
      for await (const result of generator) {
        await writeEvent(result);
      }
    } catch (error) {
      // Swallow errors; the client will handle stream end
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
