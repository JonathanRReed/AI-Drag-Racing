/**
 * The methodology page as data. pages/methodology.tsx renders it and
 * scripts/generate-llms-full.ts writes the same words to public/llms-full.txt,
 * so the page and the assistant-facing file can never drift apart.
 *
 * Inline syntax inside text: **bold**, `code`, [label](href).
 */
export const METHODOLOGY_UPDATED = '2026-10-24';

export type Definition = { term: string; short?: string; definition: string };
export type Step = { name: string; text: string };
export type Block = { type: 'p'; text: string } | { type: 'list'; items: string[] };
export type Section = { id: string; heading: string; blocks: Block[] };

export const DEFINITIONS: Definition[] = [
  {
    term: 'Time to first token',
    short: 'TTFT',
    definition:
      'The first content chunk timestamp minus the start timestamp. An empty keepalive frame does not count as a start.',
  },
  {
    term: 'Total time',
    definition: 'The finish timestamp minus the start timestamp. Finish is stamped when the provider closes its stream, or observed by the browser when a client limit stops the lane.',
  },
  {
    term: 'Tokens per second',
    short: 'tok/s',
    definition:
      'Output tokens divided by the seconds from first content to finish, excluding the initial wait. The streaming window must be at least 150 ms, with finite, ordered timestamps and a finite nonnegative output count. Missing or invalid data and stream-event counts produce unavailable TPS, not zero; total input-plus-output tokens are never substituted.',
  },
  {
    term: 'Browser clock and edge clock',
    definition:
      'Browser timings include your connection to Cloudflare. Edge timings describe the leg from the Cloudflare worker to the provider. Browser-synthetic and demo intervals are not edge measurements; edge fields are unavailable without explicit edge provenance.',
  },
  {
    term: 'Token count',
    definition:
      'Google Gemini uses valid reported usage where available, including zero; missing or invalid fields fall back to estimates or a derived total. The whole breakdown is labeled provider-reported only when all three fields are reported, otherwise estimated or mixed. Other raceable providers estimate characters divided by four, rounded up. Client-limited counts are content chunks, not tokens.',
  },
  {
    term: 'Colo',
    definition:
      'The coarse Cloudflare data center code where the edge function ran. It describes the edge hop, not the provider data center, which is unknown.',
  },
  {
    term: 'n = 1',
    definition: 'One run per model per race. No warm-up, no automatic repeat, no median across trials, no outlier removal.',
  },
];

export const HOW_TO_COMPARE: Step[] = [
  {
    name: 'Fix the prompt',
    text: 'Pick the models and one prompt, then keep that prompt unchanged for every race you intend to compare.',
  },
  {
    name: 'Use one set of sampling settings',
    text: 'The same temperature, max tokens, and top p go to every lane. Decide reasoning effort per model on purpose, and note it.',
  },
  {
    name: 'Stay in one race mode',
    text: 'Drag Race and Free Run use edge metrics. Chunk Sprint and Time Trial may stop in the browser and synthesize metrics; a lane that completes naturally first retains its edge metrics. Read each lane’s source before comparing.',
  },
  {
    name: 'Repeat before believing an ordering',
    text: 'Run the same race at least three times at different minutes. If the order changes between runs, report that instead of the single best run.',
  },
  {
    name: 'Read the clocks separately',
    text: 'Look at time to first token and tokens per second as two numbers, compare the edge and browser rows, and note the colo the receipt recorded.',
  },
  {
    name: 'Cite with the context attached',
    text: 'Include the date, the exact model IDs, the prompt, the sampling settings, and the number of runs. State the count and clock sources: Google can report, estimate, or mix usage fields; other raceable providers estimate tokens, and client-limited lanes count chunks.',
  },
];

export const SECTIONS: Section[] = [
  {
    id: 'clock',
    heading: 'Where the clock actually runs',
    blocks: [
      {
        type: 'p',
        text:
          'When you start a race, your browser sends one POST per model to `/api/providers/<provider>/completions`. That endpoint is a Cloudflare Pages Function on the edge runtime, and it is the piece that calls the provider’s streaming API. The timer starts inside that function on the line right before the outbound request, and stops when the provider’s stream closes.',
      },
      {
        type: 'p',
        text:
          'The finish receipt keeps both clocks separate. Browser TTFT and browser total include your connection to Cloudflare. Edge TTFT and edge total describe the worker-to-provider leg. Synthetic browser intervals and demo timings are not shown as edge measurements. New non-edge receipts store null edge fields and default to the observed browser clock if metric provenance is absent; old values remain unchanged in storage and exports, but are masked in the display.',
      },
    ],
  },
  {
    id: 'hardware',
    heading: 'Hardware and region, answered honestly',
    blocks: [
      {
        type: 'p',
        text:
          'There is no benchmark machine. The timing code runs in a Cloudflare V8 isolate at whichever data center Cloudflare routes your request to. The app records the coarse Cloudflare colo code returned by the runtime, not an IP address, precise location, CPU model, or browser hardware profile.',
      },
      {
        type: 'p',
        text:
          'Provider region is still unknown. No region parameter is sent to OpenAI, Groq, Anthropic, Google, Cohere, Mistral, Together, Fireworks, OpenRouter, Cerebras, Moonshot, or Z.AI, and their streaming responses do not identify the serving region. A Cloudflare colo describes the edge hop, not the provider data center.',
      },
    ],
  },
  {
    id: 'request',
    heading: 'What gets sent',
    blocks: [
      {
        type: 'p',
        text:
          'One streaming request per model. The message list holds a single user message containing your prompt verbatim. No system prompt, no conversation history, no retries. If a request fails, the lane shows the error instead of quietly trying again, which is deliberate: a silent retry would hide the exact provider behavior worth seeing.',
      },
      {
        type: 'p',
        text:
          'Provider keys stay in session storage for the current browser tab. A race sends the key and prompt through the site\'s Cloudflare route to the selected provider. Neither is written to a race record, but the provider may retain request data under its own policy and account terms.',
      },
      {
        type: 'p',
        text:
          'Default sampling is temperature 0.7, max tokens 2048, and top p 1.0. All three are adjustable in Race Settings (temperature 0 to 2, max tokens 100 to 4096, top p 0 to 1), and whatever you pick is sent to every model in that race, so the lanes stay comparable to each other.',
      },
      {
        type: 'p',
        text:
          'Reasoning effort is the one setting that is not applied uniformly. The code only attaches it when the model ID looks like a reasoning model, matching on o1, o3, gpt-5, k2 or kimi-k2, glm-4.6-thinking, or any ID containing thinking, reasoning, or reflect. You can also switch it off per model before a race. A reasoning model running at high effort will look slow next to a non-reasoning model, and that is a real difference in what the two are doing rather than a measurement artifact.',
      },
    ],
  },
  {
    id: 'numbers',
    heading: 'What each number means',
    blocks: [
      {
        type: 'p',
        text:
          '**Time to first token** is the first-chunk timestamp minus the start timestamp. The stamp lands on the first chunk carrying non-empty content, so an empty keepalive frame does not count as a start.',
      },
      {
        type: 'p',
        text:
          '**Total time** is the finish timestamp minus the start timestamp, where finish is stamped as the provider’s stream closes, or observed in the browser when a client limit stops the lane. The displayed source identifies the clock.',
      },
      {
        type: 'p',
        text:
          '**Tokens per second** divides output tokens by the seconds from first content to finish. Both the lane and comparison chart require finite timestamps ordered start, first content, finish, a streaming window of at least 150 ms, a finite nonnegative output count, and a finite calculated rate. Shorter windows may be buffered flushes and are unavailable, as are missing or invalid data and stream-event counts: events are not output tokens. Total input-plus-output tokens never replace a missing output count. A valid zero output count gives 0 TPS; unavailable lanes have no throughput bar and sort last in either direction. Estimated or mixed breakdowns and demo rates are labeled. The initial wait is excluded, so this is a streaming rate, not an end to end rate; a model with a slow start can still post the highest tok/s.',
      },
      {
        type: 'p',
        text:
          '**Token counts** are where the honesty matters most. Google Gemini accepts nonnegative safe integer usage fields, including zero. Valid reported input, output and total counts are preserved independently; missing or invalid input/output counts use cumulative text length divided by four, rounded up, and a missing or invalid total uses their sum. A later missing field retains an earlier report; a present invalid field does not. Only a fully reported breakdown is labeled provider-reported; other breakdowns are conservatively labeled estimated or mixed because one source field cannot identify each field’s origin. Reported means origin, not verified accuracy, and totals may include other usage categories. Other raceable providers use the character-based estimate, which is rough, especially for code and non-English text. Legacy outputTokens values retain token units when count-source metadata is absent, with that origin explicitly unspecified; finite nonnegative fractional estimates remain valid, matching the throughput contract. Timing charts leave missing or invalid intervals unavailable instead of plotting zero; valid observed zero intervals remain zero. Count displays keep content chunks separate from tokens; token-count charts omit chunks, unknown units and unavailable values rather than replacing them with zero.',
      },
      {
        type: 'p',
        text:
          '**The live pace chart** plots characters received, not tokens, against a browser clock that starts from one shared Go instant for every lane. It is the one view that includes your own network path, which is why its curve can disagree slightly with the timing table.',
      },
      {
        type: 'p',
        text:
          '**Time Trial ranking** uses the most received output, not the shortest finish time. The count is JavaScript text.length: UTF-16 code units, the same unit already used by the live pace buffers, not tokens or visible characters. Failed lanes cannot win, and equal output keeps the original lane order. New local receipts record this output length; older receipts with missing or invalid evidence cannot establish a Time Trial winner. Shared v1 receipts omit output length, so shared Time Trials show neutral original lane order rather than a ranking.',
      },
    ],
  },
  {
    id: 'sample-size',
    heading: 'Sample size',
    blocks: [
      { type: 'p', text: 'One run per model per race. n = 1.' },
      {
        type: 'p',
        text:
          'There is no warm-up request, automatic repeat, median across trials, or outlier removal. Every lane fires at the same moment from a single shared start. Experiment Lab exposes the settings, but each run is still a single observation. Repeat it yourself before treating an ordering as stable.',
      },
      {
        type: 'p',
        text:
          'A single race tells you very little about a provider. It tells you what happened once, on one route, under whatever load that provider was carrying in that second. Run the same prompt several times before you believe an ordering, and stop believing it as soon as the prompt or the model changes.',
      },
    ],
  },
  {
    id: 'race-modes',
    heading: 'Client limits change what is measured',
    blocks: [
      {
        type: 'p',
        text:
          'Drag Race and Free Run read metrics from the edge function. Chunk Sprint stops after the configured number of content chunks (stream events), not tokenizer tokens; chunk sizes vary by provider. The legacy internal mode ID remains token_limit. Time Trial stops at its browser deadline. A client-limited lane has browser-synthetic timing and a chunk count, not provider completion timing or output tokens. Its edge fields and token throughput are unavailable. A lane that completes naturally before its limit retains the provider-route metrics instead, so even one race can contain different measurement sources. Read the per-lane sources and do not compare unlike units or clocks as equivalent. The limit and ranking behavior are unchanged.',
      },
      {
        type: 'p',
        text:
          'The test race button is a simulation. It replays hardcoded timings so the visualization can be tried without API keys. None of those numbers came from a provider.',
      },
    ],
  },
  {
    id: 'not-recorded',
    heading: 'What the code does not do',
    blocks: [
      {
        type: 'list',
        items: [
          '**No server-side race archive.** Sanitized receipts are kept only in this browser for up to 30 days. They include model and provider IDs, settings, coarse edge colo, timing, token counts, output length for new records, prompt length, and a prompt fingerprint. They do not include the prompt text, response text, API keys, IP address, or precise location. You can export or delete them at any time.',
          '**No model version pinning.** The model list comes from each provider’s live models endpoint at the moment you open the app. Many of those IDs are aliases, and providers move them onto new weights without changing the string. A race from today and a race from last month can carry the same label and not be the same model.',
          '**No quality scoring.** Responses sit next to the timings so you can judge them yourself. Nothing in the app grades them.',
          '**No cost math in the race view.** Speed only.',
          '**No hidden provider fallbacks.** The lineup only lists providers wired to the live completion route. A failed route stays failed instead of silently switching to another provider or model.',
        ],
      },
    ],
  },
  {
    id: 'citing',
    heading: 'If you are citing a result',
    blocks: [
      {
        type: 'p',
        text:
          'Say what it is: a single live run with its recorded clock and count sources, and no controlled hardware or region. State whether timings are edge-measured or browser-synthetic and whether counts are provider-reported, estimated or mixed tokens, or streamed chunks. Include the date, the exact model IDs, and the prompt. Without those three, the number stops meaning anything a month later.',
      },
      {
        type: 'p',
        text:
          'For model capability and pricing context I keep a separate project at [AI Stats](https://aistats.jonathanrreed.com). This site answers one narrower question: how fast did this model respond, right now, on this route. The [about page](/about) covers why it exists, and the [privacy page](/privacy) covers what happens to the API key you paste in.',
      },
    ],
  },
];

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

/** Plain-text form of the inline syntax for text files and JSON-LD. */
export function plainText(text: string): string {
  return text.replace(INLINE, (token) => {
    if (token.startsWith('**')) return token.slice(2, -2);
    if (token.startsWith('`')) return token.slice(1, -1);
    const match = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    return match ? `${match[1]} (${match[2]})` : token;
  });
}

export { INLINE as INLINE_PATTERN };
