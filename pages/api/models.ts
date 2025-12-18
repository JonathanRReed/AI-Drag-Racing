export const config = { runtime: 'edge' };

type ModelResponse = {
    data: string[];
    error?: string;
};

// Comprehensive static fallback lists for when API calls fail
const STATIC_FALLBACKS: Record<string, string[]> = {
    groq: [
        // Llama 3/3.1/3.3 Series
        'llama-3.3-70b-versatile',
        'llama-3.1-70b-versatile',
        'llama-3.1-8b-instant',
        'llama3-70b-8192',
        'llama3-8b-8192',
        'llama-guard-3-8b',
        'meta-llama/llama-guard-4-12b',
        // Llama 4 Preview
        'groq/meta-llama/llama-4-maverick-17b-128e-instruct',
        'groq/meta-llama/llama-4-scout-17b-16e-instruct',
        // Mistral / Mixtral
        'mistral-saba-24b',
        'mixtral-8x7b-32768',
        // Gemma
        'gemma2-9b-it',
        // Whisper
        'whisper-large-v3',
        'whisper-large-v3-turbo',
        // Qwen
        'qwen-qwq-32b',
        'qwen/qwen3-32b',
        // Moonshot on Groq
        'moonshotai/kimi-k2-instruct',
    ],
    anthropic: [
        // Claude 4.5 Series (Late 2025)
        'claude-opus-4-5-20251101',
        'claude-sonnet-4-5-20250929',
        'claude-haiku-4-5-20251001',
        // Claude 4.0 Series
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250522',
        'claude-3-7-sonnet-20250224',
        // Claude 3.5 Series
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-5-sonnet-20240620',
        // Legacy
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
    ],
    moonshot: [
        // Kimi 2 Series
        'kimi-k2-0905-preview',
        'kimi-k2-thinking',
        'kimi-k2-turbo-preview',
        'kimi-k2-instruct',
        'kimi-latest',
        // Moonshot V1 Series
        'moonshot-v1-8k',
        'moonshot-v1-32k',
        'moonshot-v1-128k',
        'moonshot-v1-auto',
    ],
    zhipu: [
        // GLM-4.6 Series
        'glm-4.6',
        'glm-4.6-thinking',
        // GLM-4 Plus
        'glm-4-plus',
        'glm-4-plus-0828',
        // GLM-4 Base
        'glm-4',
        'glm-4-0520',
        'glm-4-long',
        // GLM-4 Air/Flash
        'glm-4-air',
        'glm-4-airx',
        'glm-4-flash',
        'glm-4-flashx',
        // Vision
        'glm-4v',
        'glm-4v-plus',
        // Code
        'codegeex-4',
    ],
    openai: [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo',
        'o1',
        'o1-mini',
        'o1-preview',
        'o3',
        'o3-mini',
        'gpt-5-preview',
    ],
};

// Sanitize API key - trim whitespace and remove any accidental quotes
function sanitizeApiKey(key: string): string {
    if (!key) return '';
    return key.trim().replace(/^["']|["']$/g, '');
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

function jsonResponse(data: ModelResponse, status = 200): Response {
    return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

export default async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return jsonResponse({ data: [], error: 'Method not allowed' }, 405);
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ data: [], error: 'Invalid JSON body' }, 400);
    }

    const { providerId, apiKey: rawApiKey } = body;
    const apiKey = sanitizeApiKey(rawApiKey);

    if (!apiKey) {
        return jsonResponse({ data: [], error: 'API key required' }, 400);
    }

    // Log safely for debugging
    const keySample = apiKey.length > 6
        ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
        : '[SHORT]';

    try {
        let ids: string[] = [];
        const timeout = 8000; // 8 second timeout

        if (providerId === 'anthropic') {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch('https://api.anthropic.com/v1/models', {
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                    },
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`Anthropic error: ${response.status}`);
                }
                const data = await response.json();
                ids = data.data?.map((m: any) => m.id) || [];
            } catch (e) {
                clearTimeout(timeoutId);
                console.warn(`[Proxy] Anthropic fetch failed, using fallback`);
                ids = STATIC_FALLBACKS.anthropic;
            }
        }

        else if (providerId === 'moonshot') {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch('https://api.moonshot.ai/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`Moonshot error: ${response.status}`);
                }
                const data = await response.json();
                ids = data.data?.map((m: any) => m.id) || [];
                // Merge with static fallback to ensure key models are always present
                const merged = new Set([...ids, ...STATIC_FALLBACKS.moonshot]);
                ids = Array.from(merged);
            } catch (e) {
                clearTimeout(timeoutId);
                console.warn(`[Proxy] Moonshot fetch failed, using fallback`);
                ids = STATIC_FALLBACKS.moonshot;
            }
        }

        else if (providerId === 'zhipu') {
            // Zhipu doesn't have a simple list endpoint - use static list
            ids = STATIC_FALLBACKS.zhipu;
        }

        else if (providerId === 'groq') {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`Groq error: ${response.status}`);
                }
                const data = await response.json();
                ids = data.data?.map((m: any) => m.id) || [];
                // Merge with fallback
                const merged = new Set([...ids, ...STATIC_FALLBACKS.groq]);
                ids = Array.from(merged);
            } catch (e) {
                clearTimeout(timeoutId);
                console.warn(`[Proxy] Groq fetch failed, using fallback`);
                ids = STATIC_FALLBACKS.groq;
            }
        }

        else if (['openai', 'fireworks', 'openrouter', 'together', 'mistral', 'cohere'].includes(providerId)) {
            // Standard OpenAI-compatible listing
            const urls: Record<string, string> = {
                openai: 'https://api.openai.com/v1/models',
                fireworks: 'https://api.fireworks.ai/inference/v1/models',
                openrouter: 'https://openrouter.ai/api/v1/models',
                together: 'https://api.together.xyz/v1/models',
                mistral: 'https://api.mistral.ai/v1/models',
                cohere: 'https://api.cohere.com/v1/models',
            };

            const url = urls[providerId];
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`${providerId} error: ${response.status}`);
                }
                const data = await response.json();

                // Handle various response shapes
                if (Array.isArray(data)) {
                    ids = data.map((m: any) => m.id);
                } else if (Array.isArray(data.data)) {
                    ids = data.data.map((m: any) => m.id);
                } else if (Array.isArray(data.models)) {
                    ids = data.models.map((m: any) => m.name || m.id);
                }

                // Merge with static fallback if available
                if (STATIC_FALLBACKS[providerId]) {
                    const merged = new Set([...ids, ...STATIC_FALLBACKS[providerId]]);
                    ids = Array.from(merged);
                }
            } catch (e) {
                clearTimeout(timeoutId);
                console.warn(`[Proxy] ${providerId} fetch failed, using fallback if available`);
                ids = STATIC_FALLBACKS[providerId] || [];
            }
        }

        return jsonResponse({ data: ids });

    } catch (error: any) {
        console.error(`[Proxy Error] Provider: ${providerId}, Key: ${keySample}`);
        console.error(`[Proxy Error] Message: ${error.message}`);

        // Return fallback data instead of error when possible
        const fallback = STATIC_FALLBACKS[providerId];
        if (fallback && fallback.length > 0) {
            console.log(`[Proxy] Returning fallback for ${providerId}`);
            return jsonResponse({ data: fallback });
        }

        return jsonResponse({
            data: [],
            error: error.message?.includes('401') || error.message?.includes('403')
                ? 'Invalid API Key'
                : 'Failed to fetch models'
        }, 500);
    }
}
