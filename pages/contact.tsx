import Head from 'next/head';

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact | AI Drag Racing</title>
        <meta
          name="description"
          content="Contact Jonathan R. Reed about AI Drag Racing, a browser benchmark for LLM latency, throughput, and model comparison."
        />
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/contact" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Contact | AI Drag Racing" />
        <meta
          property="og:description"
          content="Contact Jonathan R. Reed about AI Drag Racing, a browser benchmark for LLM latency, throughput, and model comparison."
        />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/Favicon/icon-512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact | AI Drag Racing" />
        <meta
          name="twitter:description"
          content="Contact Jonathan R. Reed about AI Drag Racing, a browser benchmark for LLM latency, throughput, and model comparison."
        />
        <meta name="twitter:image" content="https://ai-dragrace.jonathanrreed.com/Favicon/icon-512.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ContactPage',
              name: 'Contact AI Drag Racing',
              description:
                'Contact Jonathan R. Reed about AI Drag Racing, a browser benchmark for LLM latency, throughput, and model comparison.',
              url: 'https://ai-dragrace.jonathanrreed.com/contact',
              datePublished: '2026-04-21',
              dateModified: '2026-06-19',
              author: {
                '@type': 'Person',
                name: 'Jonathan R. Reed',
                url: 'https://jonathanrreed.com',
              },
            }),
          }}
        />
      </Head>
      <main className="min-h-dvh bg-[var(--bg)] px-6 py-16 text-[var(--text)]">
        <article className="mx-auto max-w-3xl rounded-[20px] border border-white/10 bg-zinc-950/70 p-8 shadow-2xl">
          <a href="/" className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400 hover:text-red-300">
            AI Drag Racing
          </a>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Contact Jonathan about AI Drag Racing.
          </h1>
          <p className="mt-5 text-base leading-8 text-zinc-300">
            For bug reports, accessibility issues, provider suggestions, or benchmark workflow feedback, use Jonathan R.
            Reed's main contact page.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Useful reports include the browser, provider, selected model, prompt length, race settings, and whether the
            issue affected API keys, streaming, timing, output display, charts, navigation, or mobile layout. If a provider
            changed its API behavior, include the error message without sharing secrets.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            For feature feedback, describe the model comparison you were trying to make and what evidence was missing.
            The project is intentionally focused on live latency and output comparison, so clear workflow examples are
            more useful than broad requests for another dashboard.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Timing reports are most useful when they separate provider behavior from interface behavior. Note whether the
            race failed before the request started, during streaming, after the final token, or while drawing the result
            chart. That makes it easier to tell whether the fix belongs in provider routing, browser storage, UI state, or
            result formatting.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Do not send provider API keys, private prompts, client data, or screenshots that expose secrets. A short
            sanitized prompt, the selected providers, and the visible error text are enough for most debugging.
          </p>
          <a
            href="https://jonathanrreed.com/contact/"
            className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
          >
            Open Jonathan's contact page
          </a>
          <p className="mt-6 text-sm text-zinc-500">
            Last updated <time dateTime="2026-06-19">June 19, 2026</time>.
          </p>
        </article>
      </main>
    </>
  );
}
