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
              dateModified: '2026-04-21',
              author: {
                '@type': 'Person',
                name: 'Jonathan R Reed',
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
            Privacy for a bring-your-own-key benchmark.
          </h1>
          <p className="mt-5 text-base leading-8 text-zinc-300">
            AI Drag Racing does not create accounts and does not run a user database for your races. Provider API keys
            are saved in browser local storage on your device so you can reuse them between sessions.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            When you start a race, your prompt and selected model settings are sent to the provider APIs you choose.
            Cloudflare Pages may process routine request metadata to host and protect the site.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Provider API keys stay in browser storage so the app can run directly from your device. Do not paste keys on a
            shared computer, and clear site data if you want to remove saved credentials. The app does not need your
            provider account password.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Race prompts can contain sensitive information if you paste it in. Treat each race as a request to the selected
            provider, and avoid confidential client data, medical records, financial details, or private employer material
            unless your own provider agreement allows that use.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Clearing site data in your browser removes saved provider keys and local settings for this site. The app does
            not provide account recovery because it does not create accounts. If you rotate or revoke a provider key, do it
            directly with that provider and update the local value before running another race.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Race results are displayed in the browser so you can compare output quality beside latency. Avoid using the
            tool for regulated or confidential prompts unless your own provider policies, data processing terms, and
            internal rules permit that workflow.
          </p>
          <p className="mt-6 text-sm text-zinc-500">
            Published <time dateTime="2026-04-21">April 21, 2026</time>.
          </p>
        </article>
      </main>
    </>
  );
}
