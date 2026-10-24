# AI Drag Racing

Send the same prompt to several language models and compare time to first token, completion time, and token throughput. Each model gets a lane with its streamed response. Use it for quick comparisons, not a controlled benchmark.

[Live site](https://ai-dragrace.jonathanrreed.com/)

## Run locally

Requires Node.js 22.12.0 or newer and Bun 1.4.4 and your own provider API keys. See [package.json](package.json) for dependencies and versions.

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

Set temperature, max tokens, and top-p as needed. The app passes these settings to providers that support them. Enter a prompt and click Start Race. A short countdown precedes the streaming requests; reduced-motion mode is supported.

Results shows responses, errors, token counts, timing, and a leaderboard. Hide failed lanes or collapse responses to compare runs. Charts compares completed runs. Reset clears the race state.

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

Built by Jonathan Reed for hello.world consulting. Icons from Lobe Icons and simple-icons.

Licensed under the Functional Source License, Version 1.1, MIT Future License. The source converts to MIT two years after each version is made available. See [LICENSE](LICENSE).
