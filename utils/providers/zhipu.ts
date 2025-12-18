import {
    ProviderService,
    CompletionResult,
    registerProviderService,
    ModelSettings,
} from '../providerService';
import { finalTokenTotal, approxTokensFromText } from '../tokens';

// Zhipu AI / GLM models - comprehensive list (Dec 2025)
export const ZHIPU_MODELS = [
    // GLM-4.6 Series (Latest flagship)
    'glm-4.6',
    'glm-4.6-thinking',
    // GLM-4 Plus Series
    'glm-4-plus',
    'glm-4-plus-0828',
    // GLM-4 Base Series
    'glm-4',
    'glm-4-0520',
    'glm-4-long',
    // GLM-4 Air (Faster, cheaper)
    'glm-4-air',
    'glm-4-airx',
    // GLM-4 Flash (Fastest)
    'glm-4-flash',
    'glm-4-flashx',
    // Vision Models
    'glm-4v',
    'glm-4v-plus',
    // Code Models
    'codegeex-4',
    // Embedding Models
    'embedding-3',
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
                    console.error('Error parsing Zhipu stream data:', e);
                }
            }
        }
    }
}

const zhipuService: ProviderService = {
    providerId: 'zhipu',

    async getModels(_apiKey: string): Promise<string[]> {
        // Zhipu doesn't have a simple public models endpoint like OpenAI
        // Return comprehensive static list of available models
        return ZHIPU_MODELS.filter(m => !m.includes('embedding')); // Filter out non-chat models
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

        // Zhipu / GLM-4 endpoint
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                stream: true,
                temperature: settings?.temperature ?? 0.7,
                max_tokens: settings?.maxTokens ?? 4096,
                top_p: settings?.topP ?? 1.0,
                // Reasoning/thinking support for GLM-4.6-thinking
                ...(model.includes('thinking') ? {
                    do_sample: true,
                } : {}),
            }),
            signal,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Zhipu API error: ${response.status} ${errorBody}`);
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

registerProviderService(zhipuService);
