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
          content="AI Drag Racing lets you run the same prompt across AI models in your browser and compare response time, throughput, and output side by side. Built by Jonathan R. Reed."
        />
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/about" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="About AI Drag Racing | Jonathan R. Reed" />
        <meta
          property="og:description"
          content="AI Drag Racing lets you run the same prompt across AI models in your browser and compare response time, throughput, and output side by side. Built by Jonathan R. Reed."
        />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/social-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About AI Drag Racing | Jonathan R. Reed" />
        <meta
          name="twitter:description"
          content="AI Drag Racing lets you run the same prompt across AI models in your browser and compare response time, throughput, and output side by side. Built by Jonathan R. Reed."
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
                'AI Drag Racing lets you run the same prompt across AI models in your browser and compare response time, throughput, and output side by side. Built by Jonathan R. Reed.',
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
            Why I built AI Drag Racing
          </h1>
          <p className="doc-lead">
            I built AI Drag Racing because I wanted a quick way to send the same prompt to a few models and see how
            fast they actually respond from my browser. You get time to first token, total time, throughput, and the
            full text side by side on one screen.
          </p>
          <p>
            Nothing here is supposed to be a universal benchmark. Your prompt, your internet connection, which models
            you pick, and how busy a provider happens to be right then all move the numbers around. Every race is just
            one live run from where you&apos;re sitting.
          </p>
          <p>
            I mostly use it when I&apos;m deciding between a couple of models for day-to-day work, especially coding or
            agent steps where waiting two seconds for a first token makes everything feel sluggish. Seeing them run
            side by side on the same prompt makes those gaps obvious before you bother setting up bigger evals.
          </p>
          <p>
            I kept the full response right next to the timing numbers because a fast model isn&apos;t really useful if
            it cuts the answer short or gets it wrong. You want to see both the clock and what the model actually wrote.
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
