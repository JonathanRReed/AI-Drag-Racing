import { writeFileSync } from 'node:fs';
import { buildLlmsFullText } from '../lib/llmsFull';

// Run: bun scripts/generate-llms-full.ts
// utils/llmsFull.test.ts fails when public/llms-full.txt is out of date.
writeFileSync('public/llms-full.txt', buildLlmsFullText());
console.log('Wrote public/llms-full.txt');
