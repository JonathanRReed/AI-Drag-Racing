import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Theme boots before paint so neither theme flashes. */}
        <script src="/site-theme.js" />
        <meta name="theme-color" content="#090b0a" />
        {/* Ecosystem type, self-hosted */}
        <link rel="preload" href="/fonts/nebula-sans/NebulaSans-Book-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/nebula-sans/NebulaSans-Semibold-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
        {/* The page heading is set in the display face, so it is part of first paint. */}
        <link rel="preload" href="/fonts/archivo/ArchivoExpanded-Italic-Variable.woff2" as="font" type="font/woff2" crossOrigin="" />
        {/* Favicons: minimal set */}
        <link rel="icon" href="/Favicon/favicon.ico" sizes="any" />
        <link rel="icon" href="/Favicon/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/Favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/Favicon/site.webmanifest" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
