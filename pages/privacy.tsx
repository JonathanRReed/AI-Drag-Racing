import Head from 'next/head';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy | AI Drag Racing</title>
        <meta
          name="description"
          content="AI Drag Racing stores provider keys in your browser local storage and sends prompts only to the provider APIs you choose for a race."
        />
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/privacy" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Privacy | AI Drag Racing" />
        <meta
          property="og:description"
          content="AI Drag Racing stores provider keys in your browser local storage and sends prompts only to the provider APIs you choose for a race."
        />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/Favicon/icon-512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Privacy | AI Drag Racing" />
        <meta
          name="twitter:description"
          content="AI Drag Racing stores provider keys in your browser local storage and sends prompts only to the provider APIs you choose for a race."
        />
        <meta name="twitter:image" content="https://ai-dragrace.jonathanrreed.com/Favicon/icon-512.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'PrivacyPolicy',
              name: 'AI Drag Racing Privacy Policy',
              description:
                'AI Drag Racing stores provider keys in your browser local storage and sends prompts only to the provider APIs you choose for a race.',
              url: 'https://ai-dragrace.jonathanrreed.com/privacy',
              datePublished: '2026-04-21',
              dateModified: '2026-09-01',
              author: {
                '@type': 'Person',
                name: 'Jonathan R. Reed',
                url: 'https://jonathanrreed.com',
                sameAs: [
                  'https://jonathanrreed.com/',
                  'https://github.com/JonathanRReed',
                ],
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
            Privacy for a bring-your-own-key benchmark.
          </h1>
          <p className="mt-5 text-base leading-8 text-zinc-300">
            AI Drag Racing does not create accounts and does not run a user database for your races. Provider API keys
            are saved in browser local storage on your device so you can reuse them between sessions.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            When you start a race, your prompt and selected model settings are sent to the provider APIs you choose.
            Cloudflare Pages may process routine request metadata to host and protect the site. See the{' '}
            <a href="/subprocessors" className="text-red-300 underline underline-offset-4">
              subprocessor disclosure
            </a>{' '}
            for the current hosting and infrastructure context.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            After a live race, the app saves a sanitized receipt in this browser for up to 30 days. It contains model
            and provider IDs, settings, timing, token counts, prompt length, a one-way prompt fingerprint, and a coarse
            Cloudflare colo code when available. It does not save prompt text, response text, API keys, IP address, or
            precise location in the receipt. You can export or delete local receipts from the race page.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Do not paste keys on a shared computer. Clearing site data removes saved provider keys and local settings,
            and there is no account recovery because there are no accounts. The app never needs your provider account
            password. If you rotate or revoke a key, do it with the provider and update the local value before the next
            race.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Treat each race as a request to the selected provider. Keep confidential client data, medical records,
            financial details, private employer material, and anything regulated out of the prompt unless your own
            provider agreement and internal rules allow that use.
          </p>
          <p className="mt-6 text-sm text-zinc-500">
            Last updated <time dateTime="2026-09-01">September 1, 2026</time>.
          </p>
        </article>
      </main>
    </>
  );
}
