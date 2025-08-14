// pages/api/bedrock-models.ts
export const config = { runtime: 'edge' };

// Edge-friendly static list of common Bedrock text models.
const STATIC_BEDROCK_MODELS: string[] = [
  'amazon.titan-text-lite-v1',
  'amazon.titan-text-express-v1',
  'anthropic.claude-3-haiku-20240307-v1:0',
  'anthropic.claude-3-sonnet-20240229-v1:0',
  'anthropic.claude-3-opus-20240229-v1:0',
  'mistral.mistral-large-2402-v1:0',
  'ai21.j2-mid-v1',
  'ai21.j2-ultra-v1',
];

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // We previously validated/parsed AWS creds here; for Edge we return a static list.
  try {
    return new Response(JSON.stringify({ models: STATIC_BEDROCK_MODELS }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Failed to list Bedrock models' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
