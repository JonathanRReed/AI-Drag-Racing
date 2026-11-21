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
      'The time between starting the request and getting the first chunk that actually contains text. Empty keepalive frames don\'t count.',
  },
  {
    term: 'Total time',
    definition:
      'The time from starting the request until the lane finishes. For normal runs, that ends when the provider closes the stream. When a browser limit cuts a lane off early, the browser records the stop time instead.',
  },
  {
    term: 'Tokens per second',
    short: 'tok/s',
    definition:
      'Output tokens divided by the seconds between the first chunk of text and the finish, leaving out the initial wait. To calculate a rate, the streaming window has to be at least 150 ms with finite, ordered timestamps and a finite nonnegative output token count. If data is missing or invalid, or if the lane only counted stream events, TPS stays unavailable instead of showing zero. Total input plus output tokens are never used as a stand-in.',
  },
  {
    term: 'Browser clock and edge clock',
    definition:
      'Browser timings include your own connection to Cloudflare. Edge timings only cover the hop from the Cloudflare worker to the provider. Synthetic browser timers and demo timings never show up as edge measurements, and edge fields stay empty unless the lane actually came from the edge timer.',
  },
  {
    term: 'Token count',
    definition:
      'For Google Gemini, the app uses provider-reported usage fields whenever they\'re valid, including zero, and falls back to estimates or a derived total if a field is missing or invalid. A breakdown is only labeled provider-reported when all three fields come from the provider, and otherwise it\'s marked estimated or mixed. Every other raceable provider estimates tokens by dividing character length by four and rounding up. Client-limited lanes count content chunks instead of tokens.',
  },
  {
    term: 'Colo',
    definition:
      'The three-letter Cloudflare data center code where the edge function ran. It tells you which Cloudflare edge handled your request, while the provider data center stays unknown.',
  },
  {
    term: 'n = 1',
    definition:
      'One run per model per race. There\'s no warm-up pass, automatic retry loop, median across trials, or outlier filtering.',
  },
];

export const HOW_TO_COMPARE: Step[] = [
  {
    name: 'Keep the prompt identical',
    text: 'Pick your models and write one prompt, then leave that prompt unchanged across every run you plan to compare.',
  },
  {
    name: 'Match your sampling settings',
    text: 'Every lane gets the same temperature, max tokens, and top p. If you\'re testing reasoning models, pick the reasoning effort on purpose and write down what you used.',
  },
  {
    name: 'Stick to one race mode',
    text: 'Drag Race and Free Run pull timings from the edge function. Chunk Sprint and Time Trial can stop in the browser and build synthetic timings, though a lane that finishes on its own first keeps its edge numbers. Check each lane\'s timing source before comparing rows.',
  },
  {
    name: 'Run it more than once',
    text: 'Do the same race at least three times a few minutes apart. If the finish order flips between runs, mention that instead of cherry-picking the quickest one.',
  },
  {
    name: 'Check TTFT and tok/s separately',
    text: 'Look at time to first token and tokens per second as two separate numbers, check both the edge and browser timings, and note the Cloudflare colo on the receipt.',
  },
  {
    name: 'Share the full context if you quote it',
    text: 'Include the date, exact model IDs, prompt, sampling settings, and how many runs you did. Also say where the clocks and counts came from: Google can report, estimate, or mix usage fields, other raceable providers estimate tokens, and client-limited lanes count chunks.',
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
          'When you start a race, your browser sends one POST per model to `/api/providers/<provider>/completions`. That route is a Cloudflare Pages Function running on the edge, and it makes the actual streaming call to the provider. The edge timer starts right before that outbound request goes out and stops when the provider closes the stream.',
      },
      {
        type: 'p',
        text:
          'The timeslip keeps the two clocks separate. Browser TTFT and browser total include your own connection to Cloudflare. Edge TTFT and edge total only measure the Cloudflare worker talking to the provider. Synthetic browser timers and demo timings are never shown as edge measurements. New non-edge receipts save null for edge fields and fall back to the browser clock if timing provenance is missing. Older saved receipts keep their raw values untouched in storage and JSON exports, while the UI hides unprovenanced edge fields.',
      },
    ],
  },
  {
    id: 'hardware',
    heading: 'Hardware and region',
    blocks: [
      {
        type: 'p',
        text:
          'This doesn\'t run on a dedicated benchmark box. The timing code runs inside a Cloudflare V8 isolate at whichever data center Cloudflare routes you to. The app only records the coarse Cloudflare colo code from the runtime, skipping your IP address, precise location, CPU model, and browser hardware details.',
      },
      {
        type: 'p',
        text:
          'I can\'t tell which provider region handled your request either. No region header or parameter gets sent to OpenAI, Groq, Anthropic, Google, Cohere, Mistral, Together, Fireworks, OpenRouter, Cerebras, Moonshot, or Z.AI, and their streaming APIs don\'t say which data center served the request. The Cloudflare colo only tells you where the edge hop happened.',
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
          'Each model gets one streaming request with a single user message containing your exact prompt. There\'s no system prompt or chat history, and the app never retries failed requests automatically. If a request errors out, the lane just shows the error because a hidden retry would cover up the exact provider hiccup you probably want to see.',
      },
      {
        type: 'p',
        text:
          'Your API keys stay in session storage for the current browser tab. Starting a race sends your key and prompt through the Cloudflare edge route to the provider you picked. Neither one gets written to a race receipt, though the provider can still store request data under its own policy and account terms.',
      },
      {
        type: 'p',
        text:
          'By default, every race runs with temperature 0.7, max tokens 2048, and top p 1.0. You can change all three in Race Settings: temperature goes from 0 to 2, max tokens from 100 to 4096, and top p from 0 to 1. Whatever you set gets passed to every lane in that race so the comparison stays consistent.',
      },
      {
        type: 'p',
        text:
          'Reasoning effort is the one setting that behaves differently per model. The app only sends it when the model ID looks like a reasoning model, matching o1, o3, gpt-5, k2, kimi-k2, glm-4.6-thinking, or any ID with thinking, reasoning, or reflect in the name. You can also turn it off for individual models before starting. A reasoning model on high effort is going to look slow next to a standard model, because it\'s actually spending time thinking before it starts writing.',
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
          '**Time to first token** is the first chunk timestamp minus the start timestamp. The clock only marks the first chunk that carries real text, so empty keepalive frames don\'t trigger it early.',
      },
      {
        type: 'p',
        text:
          '**Total time** is the finish timestamp minus the start timestamp. Normally finish is recorded when the provider closes its stream. If a client limit stops the lane first, the browser records the finish time instead, and the timing source label tells you which clock you\'re looking at.',
      },
      {
        type: 'p',
        text:
          '**Tokens per second** takes output tokens and divides them by the seconds from first text to finish. To show a rate on the lane cards and comparison charts, the timestamps have to be finite and in order from start to first text to finish, the streaming window has to be at least 150 ms, and both the output token count and the final rate have to be valid nonnegative finite numbers. Anything under 150 ms can just be a buffered flush, so those show up as unavailable. Missing data, invalid numbers, and stream-event chunk counts also show as unavailable instead of zero, and total input plus output tokens are never substituted for missing output tokens.',
      },
      {
        type: 'p',
        text:
          'A real zero output count still gives 0 TPS. Lanes without a valid rate get no throughput bar and sort to the bottom in either sort direction. Because the initial wait before the first token is left out, tok/s reflects streaming speed once text starts moving. A model that takes a while to wake up can still end up with the highest streaming rate. Estimated, mixed, and demo rates are labeled so you can tell them apart.',
      },
      {
        type: 'p',
        text:
          '**Token counts** depend on the provider. For Google Gemini, the app accepts nonnegative safe integer usage fields, including zero. Valid reported input, output, and total counts are kept on their own. If input or output is missing or invalid, the app estimates it from cumulative text length divided by four, rounded up, and if total is missing or invalid it adds those two together. A later empty field keeps an earlier valid report, while a present invalid field drops it. The breakdown is only labeled provider-reported when all three fields came from Google. Otherwise it\'s labeled estimated or mixed because a single flag can\'t trace each field individually. Reported also only tells you where the number came from rather than guaranteeing accuracy, and provider totals can include extra usage categories.',
      },
      {
        type: 'p',
        text:
          'All other raceable providers use the character estimate of length divided by four, rounded up. That\'s a rough guess, especially on code or non-English text. Older saved receipts with legacy `outputTokens` and no count-source metadata keep token units with their origin marked unspecified, and finite nonnegative fractional estimates remain valid so counts match the throughput math. On the charts, missing or invalid timing intervals stay unavailable while real observed zeros stay zero. Content chunks stay separate from tokens everywhere, and the token count chart leaves out chunks, unknown units, and unavailable values instead of plotting them as zero.',
      },
      {
        type: 'p',
        text:
          '**The live pace chart** plots characters received against a shared browser clock that starts at Go for every lane. Because it runs in your browser, it includes your own network path, which is why the live curve can differ slightly from the edge timing table.',
      },
      {
        type: 'p',
        text:
          '**Time Trial ranking** goes by whichever lane received the most output rather than who stopped first. It measures output with JavaScript `text.length`, which counts UTF-16 code units, matching what the live pace buffers track instead of tokens or visual characters. Failed lanes can\'t win, and exact ties keep their original lane order. New local receipts save this output length, while older local receipts without valid length data can\'t pick a Time Trial winner. Shared v1 receipts leave out output length too, so shared Time Trials just list lanes in their original order.',
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
          'There\'s no warm-up request, automatic repeat, multi-run median, or outlier filtering. Every lane launches together from one shared start. Experiment Lab opens up the controls, while every race is still just a single run. If you want to trust an ordering, run it again yourself.',
      },
      {
        type: 'p',
        text:
          'One race only tells you what happened right then, on your connection, under whatever load a provider had in that second. Run the same prompt a few times before putting weight on the order, and expect it to change whenever the prompt or model changes.',
      },
    ],
  },
  {
    id: 'race-modes',
    heading: 'How client limits change the numbers',
    blocks: [
      {
        type: 'p',
        text:
          'Drag Race and Free Run read their metrics from the Cloudflare edge function. Chunk Sprint cuts off after a set number of streamed content chunks, which are stream events rather than tokenizer tokens, and chunk sizes vary a lot from one provider to the next. Its legacy internal mode ID is still `token_limit`. Time Trial cuts off when the browser timer hits your deadline.',
      },
      {
        type: 'p',
        text:
          'Whenever the browser stops a lane early, that lane gets browser-synthetic timing and a chunk count instead of provider completion timing and output tokens, so its edge fields and token throughput stay unavailable. If another lane in the exact same race finishes naturally before the limit hits, it keeps its real edge metrics. That means a single race can mix measurement sources across lanes, so check each lane\'s source label before comparing two rows directly. The stopping and ranking rules stay the same.',
      },
      {
        type: 'p',
        text:
          'The demo race button is just a local simulation. It replays hardcoded timings so you can see how the track works without pasting an API key, and none of those numbers come from a real provider.',
      },
    ],
  },
  {
    id: 'not-recorded',
    heading: 'What the code doesn\'t do',
    blocks: [
      {
        type: 'list',
        items: [
          '**No server-side race archive.** Sanitized receipts stay in your browser for up to 30 days. They store model and provider IDs, settings, coarse edge colo, timing, token counts, output length on new records, prompt length, and a prompt fingerprint. They do not include the prompt text, response text, API keys, IP address, or precise location. You can export or delete them whenever you want.',
          '**No model version pinning.** Model lists load live from each provider\'s models endpoint when you add a key. A lot of model IDs are aliases that providers point at newer weights without changing the name, so a race today and a race next month can have the exact same label and still hit different weights.',
          '**No quality grading.** Every response sits right next to its timing so you can read it yourself. The app never scores answer quality.',
          '**No cost tracking.** This tool only tracks speed.',
          '**No hidden provider fallbacks.** Only providers wired into the live completion route show up in the list. If a route errors out, it stays failed instead of quietly falling back to another model or provider.',
        ],
      },
    ],
  },
  {
    id: 'citing',
    heading: 'If you quote a result',
    blocks: [
      {
        type: 'p',
        text:
          'Just call it what it is: one live run with its clock and count sources attached, on whatever Cloudflare edge and provider region you happened to hit. Note whether the timings came from the edge or the browser, and whether counts are provider-reported tokens, estimated or mixed tokens, or streamed chunks. Include the date, exact model IDs, and prompt too, because a speed number doesn\'t mean much a month later without those.',
      },
      {
        type: 'p',
        text:
          'For model pricing, context limits, and benchmarks, I keep a separate site at [AI Stats](https://aistats.jonathanrreed.com). AI Drag Racing only tries to answer one smaller question: how fast did this model respond right now from here. Check the [about page](/about) for why I built it, and the [privacy page](/privacy) for how your API keys are handled.',
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
