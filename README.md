# AI Drag Racing

Send the same prompt to several language models and compare time to first token, completion time, and token throughput. Each model gets a lane with its streamed response. Use it for quick comparisons, not a controlled benchmark.

[Live site](https://ai-dragrace.jonathanrreed.com/)

## Run locally

Requires Node.js 24 LTS (`.node-version` pins 24.22.3; 24.11.0+ and Node 26 also work) and Bun 1.4.4 and your own provider API keys. See [package.json](package.json) for dependencies and versions.

```bash
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000`. To test a production build:

```bash
bun run build
bun run start
```

The app uses Next.js, React, TypeScript, Tailwind CSS, and Chart.js. The Pages build statically exports the existing UI and bundles the three existing Fetch API handlers into an application-owned native `_worker.js`. See [the Pages build contract](docs/native-pages.md).

## Run a race

In the sidebar's Racers list, click Add for a provider, enter its API key, and save. The app fetches that provider's available models. Select models, then turn on Enable for race for each provider you want to include.

Choose a mode in Race Settings:

| Mode | Finish condition |
| --- | --- |
| Drag Race | First model to finish wins |
| Chunk Sprint | Receive a fixed number of content chunks (stream events, not tokenizer tokens) |
| Time Trial | Generate as much as possible within a time limit |
| Free Run | Watch completions without an explicit race limit |

Chunk Sprint keeps the legacy internal `token_limit` mode ID and whole-chunk stopping behavior. Chunk sizes vary by provider. A client-limited lane shows chunk counts and browser-synthetic timing; it does not claim edge timing or token throughput. Natural early completions retain their edge metrics.

Set temperature, max tokens, and top-p as needed. The app passes these settings to providers that support them. Each ready model takes a lane on the strip at the top of the page. Enter a prompt and click Start race. A starting-tree countdown precedes the streaming requests; reduced-motion mode skips it. Starting-tree sound is off until you turn it on from the strip's bar.

During a race the strip shows each lane's progress, a scoreboard, and live standings; Telemetry switches the strip to a pace chart. A finished race prints a timeslip with each lane's timing and output count. Responses shows what each model wrote, with errors and per-lane measurements. Hide failed lanes or collapse responses to compare runs. Charts compares completed runs. Reset clears the race state.

To try the interface without a key, click Run a demo race. Demo timings are simulated and are never saved.

## Providers

The registry includes OpenAI, Groq, Fireworks, Together, Azure, Anthropic, Google Gemini, OpenRouter, AWS Bedrock, Cohere, Mistral, Perplexity, xAI, DeepSeek, AI21, and Cerebras. Provider capabilities and model availability differ; see [utils/providers.ts](utils/providers.ts).

## Keys and stored settings

API keys live in tab-scoped `sessionStorage`. The app sends them through its Cloudflare edge route when you run or configure that provider. Closing the tab clears them. Current builds also remove keys that older versions left in `localStorage`.

Model and provider selections persist in `localStorage`. No API keys are hard-coded in the repository.

## Add a provider

Implement a `ProviderService`, register the provider and its `PROVIDERS` configuration, then add an `/api/providers/{id}/completions` route.

| File | Role |
| --- | --- |
| [utils/providers.ts](utils/providers.ts) | Provider registry |
| [utils/providerService.ts](utils/providerService.ts) | Provider interface |
| [utils/apiClient.ts](utils/apiClient.ts) | Client streaming |
| [components/sidebar/ProviderList.tsx](components/sidebar/ProviderList.tsx) | Provider settings UI |
| [pages/index.tsx](pages/index.tsx) | Main page and reducer |

## Credits and license

Built by Jonathan Reed for hello.world consulting. Icons from Lobe Icons and simple-icons. Type: Nebula Sans, JetBrains Mono, Archivo (display, subset), and DSEG7 (scoreboard digits, subset); Archivo and DSEG7 are under the SIL Open Font License, with license files beside the fonts in `public/fonts`.

Licensed under the Functional Source License, Version 1.1, MIT Future License. The source converts to MIT two years after each version is made available. See [LICENSE](LICENSE).
