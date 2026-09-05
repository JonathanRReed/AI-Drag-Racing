import { DEFINITIONS, HOW_TO_COMPARE, METHODOLOGY_UPDATED, plainText, SECTIONS } from './methodologyContent';

const SITE = 'https://ai-dragrace.jonathanrreed.com';

/** The full assistant-facing text file, built from the same content the methodology page renders. */
export function buildLlmsFullText(): string {
  const lines: string[] = [
    '# AI Drag Racing, full methodology',
    '',
    '> How AI Drag Racing measures model speed from a visitor\'s own browser and route: where the timer runs, what request is sent, how time to first token, total time, and tokens per second are calculated, the n = 1 sample size, and what the code does not record. Same words as the methodology page.',
    '',
    `Site: ${SITE}/`,
    `Short guide: ${SITE}/llms.txt`,
    `Methodology page: ${SITE}/methodology`,
    `Privacy: ${SITE}/privacy`,
    `Content as of: ${METHODOLOGY_UPDATED}`,
    '',
    'Usage policy: search indexing allowed, AI answers with attribution and a link allowed, AI training not allowed. Matches the content signals in /robots.txt.',
    '',
    'What this site is: a browser tool that sends one prompt to models the visitor selects, with the visitor\'s own provider API key, and reports the timing of that single run. Every result is one observation from one route at one moment. There is no leaderboard, no global ranking, and no claim about which model is fastest in general.',
    '',
    'Linking in: /?model=<openrouter id>&provider=openrouter preselects a model when the visitor supplies an OpenRouter key.',
    '',
    '## Definitions',
    '',
    ...DEFINITIONS.map((entry) => `- ${entry.term}${entry.short ? ` (${entry.short})` : ''}: ${entry.definition}`),
    '',
    '## How to run a comparison worth quoting',
    '',
    ...HOW_TO_COMPARE.map((step, index) => `${index + 1}. ${step.name}. ${step.text}`),
    '',
  ];
  for (const section of SECTIONS) {
    lines.push(`## ${section.heading}`, '');
    for (const block of section.blocks) {
      if (block.type === 'p') lines.push(plainText(block.text), '');
      else lines.push(...block.items.map((item) => `- ${plainText(item)}`), '');
    }
  }
  lines.push(
    '## Providers wired to the live route',
    '',
    'OpenAI, Groq, Anthropic, Google, Cohere, Mistral, Together, Fireworks, OpenRouter, Cerebras, Moonshot, Z.AI. The model list for each comes from the provider\'s live models endpoint at the moment the app opens.',
    '',
    '## Related tools by the same author',
    '',
    '- AI Stats (https://aistats.jonathanrreed.com/): published price, speed, context, and benchmark measurements per model.',
    '- Prompt Info (https://prompt-info.helloworldfirm.com/): what a prompt or recurring workload costs.',
    '- AI News (https://ai-news.helloworldfirm.com/): official announcements, dated and linked to the source.',
    '- PoliBench (https://polibench.jonathanrreed.com/): where models land on political questions, measured from output only.',
    '',
  );
  return lines.join('\n');
}
