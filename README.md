# AI Drag Racing – Model Performance Showdown

Race large language models head‑to‑head across multiple providers & see who wins.

This Next.js app lets you:

- **Plug in your own API keys** for multiple AI providers
- **Select one or more models per provider**
- **Run “drag races”** with different race modes
- Visualize **time‑to‑first‑token, total duration, and token throughput**

Good for fun & quick benchmarking models.

---

## Features

- **Multi‑provider support**

  Compare models from providers such as:
  - OpenAI
  - Groq
  - Fireworks
  - Together
  - Azure
  - Anthropic
  - Google Gemini
  - OpenRouter AWS Bedrock
  - Cohere
  - Mistral
  - Perplexity
  - xAI (Grok)
  - DeepSeek
  - AI21
  - Cerebras

- **Race modes**

  Configure how the race is scored:
  - **Drag Race** – first model to finish wins
  - **Token Sprint** – race to generate a fixed number of tokens
  - **Time Trial** – see who outputs the most in a fixed time window
  - **Free Run** – no explicit limits; watch full completions

- **Detailed metrics**

  For each model you’ll see:
  - Start time and first‑token time
  - Finish time
  - Token counts (total / output)
  - Streaming text response

- **Rich UI**

  - Racing‑themed layout with “lanes”
  - Results grid and leaderboard
  - Charts view with per‑model comparisons
  - Provider / model search and filtering

---

## Tech Stack

- **Framework**: Next.js
- **Language**: TypeScript + React
- **Styling**: Tailwind CSS + custom glassmorphism components
- **Charts**: `chart.js` + `react-chartjs-2`
- **Deployment**: Cloudflare Pages (via `@cloudflare/next-on-pages`)

See [package.json](cci:7://file:///Users/jonathanreed/Downloads/AI-Drag-Racing/package.json:0:0-0:0) for exact versions.

---

## Getting Started

### Prerequisites

- **Node.js** `>= 18.18.0`
- A package manager such as `npm` (or `pnpm` / `yarn` if you prefer)

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

The app will start on `http://localhost:3000` by default.

---

## Usage

### 1. Add API keys

On the left sidebar:

- Open the **Racers** list.
- For each provider you want to use:
  - Click **Add** (plus icon).
  - Paste your API key.
  - Save.

Keys are stored in `localStorage` in your browser and used only to call your own backend endpoints (e.g. `/api/providers/{providerId}/completions`).

You control which providers you enable; no keys are hard‑coded in the repo.

### 2. Fetch and select models

Once a key is saved for a supported provider:

- The app automatically **fetches available models** for that provider.
- Use the **Models** list under each provider to:
  - Search by model name.
  - Select one or more models (checkboxes).
  - Toggle **“Enable for race”** per provider.

Model and provider selections persist in `localStorage` so you don’t have to reconfigure on every visit.

### 3. Configure the race

In **Race Settings** (sidebar):

- Choose a **Race Mode**:
  - Drag Race
  - Token Sprint (set a token limit)
  - Time Trial (set a time limit, in seconds)
  - Free Run
- Adjust **model settings**:
  - Temperature
  - Max tokens
  - Top‑p

These settings are passed through to each provider’s API (where supported).

### 4. Enter a prompt and start

At the top:

1. Enter your **prompt** in the prompt bar.
2. Optionally expand to multi‑line mode for longer prompts.
3. Click **Start Race** (or press Enter when available).

The app:

- Starts a short countdown (accessible reduced‑motion mode supported).
- Sends streaming completion requests to each selected provider/model pair.
- Updates each lane in real time with streamed text and metrics.

### 5. Inspect results & charts

- **Results** tab:
  - View streaming output per model.
  - See errors for any failing lanes.
  - Quickly **hide failed** or **collapse/expand all** results.
  - Leaderboard ranks models by performance.

- **Charts** tab:
  - Visual comparison of metrics across all completed runs.
  - Switch to this tab once you have results.

You can **Reset** at any time to clear state and run a fresh race.

---

## Environment & Configuration

Most configuration is done in‑app, but for reference:

- **Providers registry**: `utils/providers.ts`
- **Provider abstractions**: `utils/providerService.ts`
- **Client streaming**: `utils/apiClient.ts`
- **Sidebar provider UI**: [components/sidebar/ProviderList.tsx](cci:7://file:///Users/jonathanreed/Downloads/AI-Drag-Racing/components/sidebar/ProviderList.tsx:0:0-0:0)
- **Main page & reducer**: `pages/index.tsx`

If you introduce a new provider, you’ll typically:

1. Implement a `ProviderService` for that provider.
2. Register it in the provider registry.
3. Add its config to `PROVIDERS` (id, display name, etc.).
4. Wire up a corresponding `/api/providers/{id}/completions` route.

---

## Build & Deployment

### Local production build

```bash
npm run build
npm start
```
---

## Credits

- Built by **Jonathan Reed** (for hello.world consulting).
- Icons by **Lobe Icons** & **simple-icons**.
- Live instance: `https://ai-dragrace.jonathanrreed.com/` (URL may change over time).

---

## License

MIT License

Copyright (c) 2025 Jonathan Ray Reed

Permission is hereby granted, free of charge, to any person obtaining a copy  
of this software and associated documentation files (the "Software"), to deal  
in the Software without restriction, including without limitation the rights  
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell  
copies of the Software, and to permit persons to whom the Software is  
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in  
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR  
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE  
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER  
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,  
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN  
THE SOFTWARE.
```

### Next step

- If you’re happy with this, paste it into [README.md](cci:7://file:///Users/jonathanreed/Downloads/AI-Drag-Racing/README.md:0:0-0:0), or tell me and I’ll apply it directly to the file for you.
