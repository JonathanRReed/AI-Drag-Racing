// pages/api/providers/[providerId]/completions.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getProviderService } from '../../../../utils/providerService';
// Side-effect imports to register provider services
import '../../../../utils/providers/openai';
import '../../../../utils/providers/groq';
import '../../../../utils/providers/anthropic';
import '../../../../utils/providers/google';
import '../../../../utils/providers/cohere';
import '../../../../utils/providers/mistral';
import '../../../../utils/providers/bedrock';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { providerId } = req.query;
  const { prompt, model, apiKey } = req.body;

  if (typeof providerId !== 'string') {
    res.status(400).json({ error: 'Invalid provider ID' });
    return;
  }

  if (!prompt || !model || !apiKey) {
    res.status(400).json({ error: 'Missing prompt, model, or apiKey' });
    return;
  }

  const providerService = getProviderService(providerId);

  if (!providerService) {
    res.status(404).json({ error: `Provider '${providerId}' not found` });
    return;
  }

  try {
    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Flush the headers to establish the connection

    const generator = providerService.generate(prompt, model, apiKey);

    for await (const result of generator) {
      res.write(`data: ${JSON.stringify(result)}\n\n`);
    }

    res.end();
  } catch (error: any) {
    console.error(`Error streaming from provider ${providerId}:`, error);
    // Note: We can't send a status code here because the headers have already been sent.
    // The client-side will need to handle the abrupt end of the stream.
    res.end();
  }
}
