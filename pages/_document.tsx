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
        {/* Favicons: minimal set */}
        <link rel="icon" href="/Favicon/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/Favicon/favicon.svg" />
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
