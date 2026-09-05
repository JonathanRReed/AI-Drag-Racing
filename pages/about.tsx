import Head from 'next/head';
import { SiteFooter, SiteHeader } from '../components/layout/SiteChrome';

export default function About() {
  return (
    <>
      <Head>
        <title>About AI Drag Racing | Jonathan R. Reed</title>
        <meta
          name="description"
          content="AI Drag Racing is a single-run browser comparison by Jonathan R. Reed for measuring LLM latency, throughput, and output behavior side by side."
        />
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/about" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="About AI Drag Racing | Jonathan R. Reed" />
        <meta
          property="og:description"
          content="AI Drag Racing is a single-run browser comparison by Jonathan R. Reed for measuring LLM latency, throughput, and output behavior side by side."
        />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/Favicon/icon-512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About AI Drag Racing | Jonathan R. Reed" />
        <meta
          name="twitter:description"
          content="AI Drag Racing is a single-run browser comparison by Jonathan R. Reed for measuring LLM latency, throughput, and output behavior side by side."
        />
        <meta name="twitter:image" content="https://ai-dragrace.jonathanrreed.com/Favicon/icon-512.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'AboutPage',
              name: 'About AI Drag Racing',
              description:
                'AI Drag Racing is a single-run browser comparison by Jonathan R. Reed for measuring LLM latency, throughput, and output behavior side by side.',
              url: 'https://ai-dragrace.jonathanrreed.com/about',
              datePublished: '2026-04-21',
              dateModified: '2026-08-04',
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
      <SiteHeader />
      <main id="main-content" className="eco-container py-12 text-[var(--text)]">
        <article className="mx-auto max-w-3xl border border-white/10 bg-zinc-950 p-6 md:p-8">
          <a href="/" className="text-xs font-medium text-red-400 hover:text-red-300">
            AI Drag Racing
          </a>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            A live timing lane for AI models.
          </h1>
          <p className="mt-5 text-base leading-8 text-zinc-300">
            AI Drag Racing lets you run model responses side by side and compare time to first token, total response
            time, throughput, and response behavior in one browser view. It is built by Jonathan R. Reed for quick
            hands-on checks when model speed matters as much as answer quality.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Nothing here is a global ranking. Your prompt, provider keys, network, selected model, and provider load
            all move the result, so read each run as one live observation.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Use it when you need to choose between models for a concrete workflow: support drafts, coding help,
            summarization, structured extraction, writing, or agent steps where slow starts are noticeable. Running the
            same prompt across several providers makes timing differences easier to see before you commit to deeper evals.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Speed metrics sit next to the response itself, because a fast model is useless if the answer comes back
            incomplete, terse, or badly formatted. Compare the time, then read what each model actually wrote.
          </p>
          <p className="mt-6 text-sm text-zinc-500">
            Last updated <time dateTime="2026-06-19">June 19, 2026</time>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
