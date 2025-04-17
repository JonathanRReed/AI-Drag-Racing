import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon links for best compatibility and quality */}
        <link rel="icon" href="/Favicon/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/Favicon/favicon.svg" />
        <link rel="icon" type="image/avif" href="/Favicon/favicon-96x96.avif" />
        <link rel="apple-touch-icon" href="/Favicon/apple-touch-icon.avif" />
        <link rel="manifest" href="/Favicon/site.webmanifest" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
