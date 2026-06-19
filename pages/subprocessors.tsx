import Head from 'next/head';

export default function Subprocessors() {
  return (
    <>
      <Head>
        <title>Subprocessor Disclosure | AI Drag Racing</title>
        <meta
          name="description"
          content="Subprocessor disclosure for AI Drag Racing, including hosting, provider API routing, and browser-local credential handling."
        />
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/subprocessors" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Subprocessor Disclosure | AI Drag Racing" />
        <meta
          property="og:description"
          content="Subprocessor disclosure for AI Drag Racing, including hosting, provider API routing, and browser-local credential handling."
        />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/Favicon/icon-512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Subprocessor Disclosure | AI Drag Racing" />
        <meta
          name="twitter:description"
          content="Subprocessor disclosure for AI Drag Racing, including hosting, provider API routing, and browser-local credential handling."
        />
        <meta name="twitter:image" content="https://ai-dragrace.jonathanrreed.com/Favicon/icon-512.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: 'Subprocessor Disclosure | AI Drag Racing',
              description:
                'Subprocessor disclosure for AI Drag Racing, including hosting, provider API routing, and browser-local credential handling.',
              url: 'https://ai-dragrace.jonathanrreed.com/subprocessors',
              datePublished: '2026-06-19',
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
            Subprocessor disclosure for AI Drag Racing.
          </h1>
          <p className="mt-5 text-base leading-8 text-zinc-300">
            AI Drag Racing is hosted on Cloudflare Pages. Cloudflare may process routine request metadata, such as IP
            address, user agent, request time, and security signals, to deliver and protect the site.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            The app uses a bring-your-own-key workflow. Provider API keys are stored in your browser, and race prompts
            are sent only to the model providers you choose for that run.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            When you select an external provider, that provider may process the prompt, model settings, streamed output,
            usage metadata, and account-level billing information according to your own provider account terms.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            AI Drag Racing does not run user accounts, shared workspaces, or hosted race history. If hosted accounts,
            payments, analytics, or team features are added later, this disclosure should be updated before those services
            receive production traffic.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            For subprocessor or data-handling questions, use the{' '}
            <a href="/contact" className="text-red-300 underline underline-offset-4">
              AI Drag Racing contact page
            </a>.
          </p>
          <p className="mt-6 text-sm text-zinc-500">
            Last updated <time dateTime="2026-06-19">June 19, 2026</time>.
          </p>
        </article>
      </main>
    </>
  );
}
