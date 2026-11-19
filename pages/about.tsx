import Head from 'next/head';
import { AUTHOR_REF } from '../lib/author';
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
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/social-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About AI Drag Racing | Jonathan R. Reed" />
        <meta
          name="twitter:description"
          content="AI Drag Racing is a single-run browser comparison by Jonathan R. Reed for measuring LLM latency, throughput, and output behavior side by side."
        />
        <meta name="twitter:image" content="https://ai-dragrace.jonathanrreed.com/social-card.png" />
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
              author: AUTHOR_REF,
            }),
          }}
        />
      </Head>
      <SiteHeader />
      <main id="main-content" className="eco-container doc">
        <article className="doc-article">
          <h1>
            A live timing lane for AI models.
          </h1>
          <p className="doc-lead">
            AI Drag Racing lets you run model responses side by side and compare time to first token, total response
            time, throughput, and response behavior in one browser view. It is built by Jonathan R. Reed for quick
            hands-on checks when model speed matters as much as answer quality.
          </p>
          <p>
            Nothing here is a global ranking. Your prompt, provider keys, network, selected model, and provider load
            all move the result, so read each run as one live observation.
          </p>
          <p>
            Use it when you need to choose between models for a concrete workflow: support drafts, coding help,
            summarization, structured extraction, writing, or agent steps where slow starts are noticeable. Running the
            same prompt across several providers makes timing differences easier to see before you commit to deeper evals.
          </p>
          <p>
            Speed metrics sit next to the response itself, because a fast model is useless if the answer comes back
            incomplete, terse, or badly formatted. Compare the time, then read what each model actually wrote.
          </p>
          <p className="doc-meta">
            Last updated <time dateTime="2026-06-19">June 19, 2026</time>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
