import {
    ProviderService,
    CompletionResult,
    registerProviderService,
    ModelSettings,
} from '../providerService';
import { finalTokenTotal, approxTokensFromText } from '../tokens';

// Moonshot AI / Kimi models - comprehensive list (Dec 2025)
export const MOONSHOT_MODELS = [
    // Kimi 2 Series (Latest reasoning models)
    'kimi-k2-0905-preview',
    'kimi-k2-thinking',
    'kimi-k2-turbo-preview',
    'kimi-k2-instruct',
    // Kimi Latest (Auto-updated)
    'kimi-latest',
    // Moonshot V1 Series (Context-length variants)
    'moonshot-v1-8k',
    'moonshot-v1-32k',
    'moonshot-v1-128k',
    // Moonshot V1 Auto (Auto-select context)
    'moonshot-v1-auto',
];

// Helper to parse SSE stream (same as OpenAI pattern)
async function* streamOpenAIResponse(
    response: Response
): AsyncGenerator<any, void, unknown> {
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('No response body');
    }
    const decoder = new TextDecoder('utf-8');
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data.trim() === '[DONE]') {
                    return;
                }
                try {
                    yield JSON.parse(data);
                } catch (e) {
                    console.error('Error parsing Moonshot stream data:', e);
                }
            }
        }
    }
}

const moonshotService: ProviderService = {
    providerId: 'moonshot',

    async getModels(apiKey: string): Promise<string[]> {
        try {
            const response = await fetch('https://api.moonshot.ai/v1/models', {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch Moonshot models');
            }
            const { data } = await response.json();
            const fetchedModels = data.map((model: any) => model.id);
            // Merge with static list to ensure we always have key models
            const allModels = new Set([...fetchedModels, ...MOONSHOT_MODELS]);
            return Array.from(allModels);
        } catch (e) {
            console.warn('Moonshot fetch models failed, using comprehensive fallback:', e);
            return MOONSHOT_MODELS;
        }
    },

    async *generate(
        prompt: string,
        model: string,
        apiKey: string,
        signal?: AbortSignal,
        settings?: ModelSettings
    ): AsyncGenerator<CompletionResult> {
        const startTime = Date.now();
        let firstTokenTime: number | undefined;
        let tokenCount = 0;
        let generatedText = '';

        const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                stream: true,
                temperature: settings?.temperature ?? 0.3,
                max_tokens: settings?.maxTokens ?? 4096,
                top_p: settings?.topP ?? 1.0,
                // Reasoning effort for Kimi 2 thinking models
                ...(model.includes('k2') || model.includes('thinking') ? {
                    reasoning_effort: settings?.reasoningEffort ?? 'medium'
                } : {}),
            }),
            signal,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Moonshot API error: ${response.status} ${errorBody}`);
        }

        for await (const chunk of streamOpenAIResponse(response)) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                if (!firstTokenTime) {
                    firstTokenTime = Date.now();
                }
                tokenCount++;
                generatedText += content;
                yield { type: 'chunk', content };
            }
        }

        const finishTime = Date.now();
        const total = finalTokenTotal({ prompt, generated: generatedText });
        const inputTokens = approxTokensFromText(prompt);
        const outputTokens = approxTokensFromText(generatedText);
        yield {
            type: 'metrics',
            data: { startTime, firstTokenTime, finishTime, tokenCount: total, inputTokens, outputTokens },
        };
    },
};

registerProviderService(moonshotService);
