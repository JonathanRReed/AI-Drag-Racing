export const OPENAI_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
};
export const GROQ_PRICING: Record<string, number> = {
  'llama2-70b-4096': 0.0008,
  'mixtral-8x7b-32768': 0.0008,
  'gemma-7b-it': 0.0002,
  'llama3-70b-8192': 0.0008,
};
