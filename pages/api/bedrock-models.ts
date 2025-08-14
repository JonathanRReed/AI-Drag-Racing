// pages/api/bedrock-models.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';

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
  const parts2 = key.split(':');
  if (parts2.length >= 3) {
    const [accessKeyId, secretAccessKey, region, sessionToken] = parts2;
    return { accessKeyId, secretAccessKey, region, sessionToken };
  }
  throw new Error('Invalid AWS credentials format. Use JSON or "ACCESS|SECRET|REGION|[SESSION]"');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { apiKey } = req.body || {};
  if (!apiKey) {
    res.status(400).json({ error: 'Missing apiKey' });
    return;
  }
  try {
    const { accessKeyId, secretAccessKey, region, sessionToken } = parseAwsCreds(apiKey);
    const client = new BedrockClient({
      region,
      credentials: { accessKeyId, secretAccessKey, sessionToken },
    });
    const cmd = new ListFoundationModelsCommand({ byOutputModality: 'TEXT' });
    const resp = await client.send(cmd);
    const models = (resp.modelSummaries || []).map((m: any) => m.modelId).filter(Boolean);
    res.status(200).json({ models });
  } catch (e: any) {
    console.error('Bedrock model list error:', e);
    res.status(500).json({ error: e?.message || 'Failed to list Bedrock models' });
  }
}
