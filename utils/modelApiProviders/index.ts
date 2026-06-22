import { ModelApiProviderHandler } from './types';
import { handleOpenAI } from './openai';
import { handleGroq } from './groq';
import { handleAzure } from './azure';
import { handleFireworks } from './fireworks';
import { handleGoogle } from './google';
import { handleOpenRouter } from './openrouter';
import { handleAnthropic } from './anthropic';
import { handleTogether } from './together';

export const modelApiProviders: Record<string, ModelApiProviderHandler> = {
  openai: handleOpenAI,
  groq: handleGroq,
  azure: handleAzure,
  fireworks: handleFireworks,
  google: handleGoogle,
  openrouter: handleOpenRouter,
  anthropic: handleAnthropic,
  together: handleTogether,
};

export * from './types';
