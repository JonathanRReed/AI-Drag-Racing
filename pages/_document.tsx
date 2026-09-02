import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preload primary font to reduce CLS */}
        <link
          rel="preload"
          href="/fonts/nebula sans/NebulaSans-Book.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        <link rel="preconnect" href="https://unpkg.com" crossOrigin="" />
        {/* Favicons: minimal set */}
        <link rel="icon" href="/Favicon/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/Favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/Favicon/site.webmanifest" />
      </Head>
      <body>
        <div
          hidden
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: AI Drag Racing is a pit-wall instrument for personal performance evidence, not a global leaderboard or an arcade shell.
OWN-WORLD: Asphalt-black timing surfaces, fixed telemetry columns, restrained signal green, amber warnings, and red reserved for failures and finish moments.
STORY: Configure a fair race, watch one authoritative live view, understand the finish, then inspect or export the evidence.
FIRST VIEWPORT: Compact identity and trust line, Quick Race and Experiment Lab switch, prompt and lineup controls, then the live timing board with the primary action always visible.
FORM: Endurance pit-wall control station, fourth grounded direction, seed 7cc6a079.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
