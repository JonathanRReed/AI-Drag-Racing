import Head from 'next/head';

const DESCRIPTION =
  'How AI Drag Racing measures LLM speed: where the timer runs, what request is sent, how time to first token, total time, and tokens per second are calculated, the n=1 sample size, and what the code does not record.';

export default function Methodology() {
  return (
    <>
      <Head>
        <title>Methodology | AI Drag Racing</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/methodology" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Jonathan R. Reed" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#07090D" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="Methodology | AI Drag Racing" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content="https://ai-dragrace.jonathanrreed.com/methodology" />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/Favicon/icon-512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Methodology | AI Drag Racing" />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content="https://ai-dragrace.jonathanrreed.com/Favicon/icon-512.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'TechArticle',
              '@id': 'https://ai-dragrace.jonathanrreed.com/methodology#article',
              headline: 'How AI Drag Racing measures model speed',
              name: 'Methodology',
              description: DESCRIPTION,
              url: 'https://ai-dragrace.jonathanrreed.com/methodology',
              inLanguage: 'en-US',
              datePublished: '2026-08-04',
              dateModified: '2026-08-04',
              author: {
                '@type': 'Person',
                name: 'Jonathan R. Reed',
                alternateName: 'Jonathan Reed',
                url: 'https://jonathanrreed.com',
                sameAs: [
                  'https://jonathanrreed.com/',
                  'https://github.com/JonathanRReed',
                  'https://helloworldfirm.com/',
                ],
              },
              isPartOf: {
                '@type': 'WebSite',
                '@id': 'https://ai-dragrace.jonathanrreed.com/#website',
                name: 'AI Drag Racing',
                url: 'https://ai-dragrace.jonathanrreed.com/',
              },
            }),
          }}
        />
        <link rel="icon" href="/Favicon/favicon.ico" sizes="any" />
      </Head>
      <main className="min-h-dvh bg-[var(--bg)] px-6 py-16 text-[var(--text)]">
        <article className="mx-auto max-w-3xl rounded-[20px] border border-white/10 bg-zinc-950/70 p-8 shadow-2xl">
          <a href="/" className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400 hover:text-red-300">
            AI Drag Racing
          </a>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            How AI Drag Racing measures model speed
          </h1>

          <p className="mt-5 text-base leading-8 text-zinc-300">
            Every number on this site comes out of one code path, so it is worth saying exactly what that path does
            before anyone quotes a result. The short version: each race is a single live request per model, timed at a
            Cloudflare edge worker, with token counts that are usually estimated rather than reported. That is good
            enough to tell you which model starts fast on your route today. It is not a controlled lab benchmark, and I
            would rather say so here than have someone cite it as one.
          </p>

          <h2 className="mt-10 text-2xl font-semibold tracking-tight text-white">Where the clock actually runs</h2>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            When you start a race, your browser sends one POST per model to{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-zinc-200">
              /api/providers/&lt;provider&gt;/completions
            </code>
            . That endpoint is a Cloudflare Pages Function on the edge runtime, and it is the piece that calls the
            provider’s streaming API. The timer starts inside that function on the line right before the outbound
            request, and stops when the provider’s stream closes.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            So the reported timings describe the edge worker to provider leg. The trip from your browser to Cloudflare
            is not counted. Your own connection still affects what you watch on screen, and it does show up in the live
            pace chart, but it does not inflate the reported time to first token.
          </p>

          <h2 className="mt-10 text-2xl font-semibold tracking-tight text-white">
            Hardware and region, answered honestly
          </h2>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            There is no benchmark machine. The timing code runs in a Cloudflare V8 isolate at whichever data center
            Cloudflare routes your request to, and nothing in the codebase records which one. No CPU model, no data
            center, no country. I cannot publish hardware specs because the code never captures them, and making a
            number up would be worse than admitting the gap.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Provider region is the same story. No region parameter is sent to OpenAI, Groq, Anthropic, Google, Cohere,
            Mistral, Together, Fireworks, OpenRouter, Cerebras, Moonshot, or Z.AI, and none of their streaming responses
            tell the app where the request was served. AWS Bedrock is the only place a region appears in the code at
            all, because it gets parsed out of the AWS credential string you paste in, and Bedrock is not wired into the
            racing endpoint anyway.
          </p>

          <h2 className="mt-10 text-2xl font-semibold tracking-tight text-white">What gets sent</h2>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            One streaming request per model. The message list holds a single user message containing your prompt
            verbatim. No system prompt, no conversation history, no retries. If a request fails, the lane shows the
            error instead of quietly trying again, which is deliberate: a silent retry would hide the exact provider
            behavior worth seeing.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Default sampling is temperature 0.7, max tokens 2048, and top p 1.0. All three are adjustable in Race
            Settings (temperature 0 to 2, max tokens 100 to 4096, top p 0 to 1), and whatever you pick is sent to every
            model in that race, so the lanes stay comparable to each other.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Reasoning effort is the one setting that is not applied uniformly. The code only attaches it when the model
            ID looks like a reasoning model, matching on o1, o3, gpt-5, k2 or kimi-k2, glm-4.6-thinking, or any ID
            containing thinking, reasoning, or reflect. You can also switch it off per model before a race. A reasoning
            model running at high effort will look slow next to a non-reasoning model, and that is a real difference in
            what the two are doing rather than a measurement artifact.
          </p>

          <h2 className="mt-10 text-2xl font-semibold tracking-tight text-white">What each number means</h2>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            <span className="font-semibold text-white">Time to first token</span> is the first-chunk timestamp minus the
            start timestamp. The stamp lands on the first chunk carrying non-empty content, so an empty keepalive frame
            does not count as a start.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            <span className="font-semibold text-white">Total time</span> is the finish timestamp minus the start
            timestamp, where finish is stamped as the provider’s stream closes.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            <span className="font-semibold text-white">Tokens per second</span> divides output tokens by the seconds
            between first token and finish. Read that one carefully. The wait for the first token is not in the
            denominator, so this is a streaming rate and not an end to end rate, and a model with a slow start can still
            post the highest tok/s in the race.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            <span className="font-semibold text-white">Token counts</span> are where the honesty matters most. Google
            Gemini returns usage metadata in its stream and the app uses those numbers directly. Every other provider
            gets an estimate: characters divided by four, rounded up. That estimate is fine for rough comparison and
            wrong in the specifics, especially for code, non-English text, and anything that tokenizes unusually. For
            those providers, treat the ordering as more trustworthy than the value.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            <span className="font-semibold text-white">The live pace chart</span> plots characters received, not tokens,
            against a browser clock that starts from one shared Go instant for every lane. It is the one view that
            includes your own network path, which is why its curve can disagree slightly with the leaderboard.
          </p>

          <h2 className="mt-10 text-2xl font-semibold tracking-tight text-white">Sample size</h2>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            One run per model per race. n = 1.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            No warm-up request, no repeats, no median across trials, no outlier removal. Every lane fires at the same
            moment from a single shared start, which keeps the starting line fair but also means the lanes share your
            connection and hit the provider APIs simultaneously.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            A single race tells you very little about a provider. It tells you what happened once, on one route, under
            whatever load that provider was carrying in that second. Run the same prompt several times before you
            believe an ordering, and stop believing it as soon as the prompt or the model changes.
          </p>

          <h2 className="mt-10 text-2xl font-semibold tracking-tight text-white">
            Two race modes measure differently
          </h2>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Drag Race and Free Run read their metrics from the edge function, which is the path described above. Token
            Sprint and Time Trial cut the stream off at the client once the limit is hit, so the provider never sends
            its final metrics event and the app synthesizes one from the browser clock and its own chunk count instead.
            Different clock, different token source. Do not compare those runs directly against Drag Race numbers.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            The test race button is a simulation. It replays hardcoded timings so the visualization can be tried without
            API keys. None of those numbers came from a provider.
          </p>

          <h2 className="mt-10 text-2xl font-semibold tracking-tight text-white">What the code does not do</h2>
          <ul className="mt-4 space-y-3 text-base leading-8 text-zinc-300">
            <li>
              <span className="font-semibold text-white">No results are stored.</span> Nothing is written to a database
              or a file, on my side or yours. Results live in browser memory and disappear on refresh, so there is no
              historical archive yet and no versioned leaderboard to link to.
            </li>
            <li>
              <span className="font-semibold text-white">No model version pinning.</span> The model list comes from each
              provider’s live models endpoint at the moment you open the app. Many of those IDs are aliases, and
              providers move them onto new weights without changing the string. A race from today & a race from last
              month can carry the same label and not be the same model.
            </li>
            <li>
              <span className="font-semibold text-white">No quality scoring.</span> Responses sit next to the timings so
              you can judge them yourself. Nothing in the app grades them.
            </li>
            <li>
              <span className="font-semibold text-white">No cost math in the race view.</span> Speed only.
            </li>
            <li>
              <span className="font-semibold text-white">Six listed providers cannot race.</span> Azure OpenAI, AWS
              Bedrock, Perplexity, xAI, DeepSeek, and AI21 appear in the sidebar, but the completions endpoint only
              registers OpenAI, Groq, Anthropic, Google, Cohere, Mistral, Together, Fireworks, OpenRouter, Cerebras,
              Moonshot, and Z.AI. The rest return a provider not found error. Model listing works for several of them;
              racing does not.
            </li>
          </ul>

          <h2 className="mt-10 text-2xl font-semibold tracking-tight text-white">If you are citing a result</h2>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Say what it is: a single live run, timed at a Cloudflare edge worker, with estimated token counts for every
            provider except Google, and no controlled hardware or region. Include the date, the exact model IDs, and the
            prompt. Without those three, the number stops meaning anything a month later.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            For model capability and pricing context I keep a separate project at{' '}
            <a
              href="https://aistats.jonathanrreed.com"
              rel="noopener noreferrer"
              className="text-red-400 underline decoration-red-400/40 underline-offset-4 hover:text-red-300"
            >
              AI Stats
            </a>
            . This site answers one narrower question: how fast did this model respond, right now, on this route. The{' '}
            <a
              href="/about"
              className="text-red-400 underline decoration-red-400/40 underline-offset-4 hover:text-red-300"
            >
              about page
            </a>{' '}
            covers why it exists, and the{' '}
            <a
              href="/privacy"
              className="text-red-400 underline decoration-red-400/40 underline-offset-4 hover:text-red-300"
            >
              privacy page
            </a>{' '}
            covers what happens to the API key you paste in.
          </p>

          <p className="mt-8 text-sm text-zinc-500">
            This page describes the code as it stands on{' '}
            <time dateTime="2026-08-04">August 4, 2026</time>. If the measurement path changes, this page changes with
            it.
          </p>
          <p className="mt-4 text-sm text-zinc-500">
            <a href="/" className="text-red-400 hover:text-red-300">
              Back to the race
            </a>
          </p>
        </article>
      </main>
    </>
  );
}
