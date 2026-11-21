import { DEFINITIONS, HOW_TO_COMPARE, METHODOLOGY_UPDATED, plainText, SECTIONS } from './methodologyContent';

const SITE = 'https://ai-dragrace.jonathanrreed.com';

/** The full assistant-facing text file, built from the same content the methodology page renders. */
export function buildLlmsFullText(): string {
  const lines: string[] = [
    '# AI Drag Racing, full methodology',
    '',
    '> How AI Drag Racing measures model speed from your browser and route: where the timer runs, what request gets sent, how time to first token, total time, and tokens per second work, the n = 1 sample size, and what the code leaves out. Same words as the methodology page.',
    '',
    `Site: ${SITE}/`,
    `Short guide: ${SITE}/llms.txt`,
    `Methodology page: ${SITE}/methodology`,
    `Privacy: ${SITE}/privacy`,
    `Content as of: ${METHODOLOGY_UPDATED}`,
    '',
    'Usage policy: search indexing and AI answers with attribution are allowed. Google-Extended may use the site for Gemini grounding and training, while other AI training is not allowed. See /robots.txt.',
    '',
    'What this site is: a browser tool that sends one prompt to the models you pick using your own provider API key and reports the timings for that single run. Every result is one live run from one route at one moment. There is no leaderboard, no global ranking, and no claim about which model is quickest overall.',
    '',
    'Linking in: /?model=<openrouter id>&provider=openrouter prefills model search. After supplying an OpenRouter key, select the model checkbox to add it to the race.',
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
