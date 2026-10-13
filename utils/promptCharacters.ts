// Bolt optimization: Cache the Intl.Segmenter instance and constructor reference.
// Constructing `new Intl.Segmenter` initializes native ICU locale data every time.
// Reusing a single cached instance avoids object allocation overhead and CPU spikes
// during high-frequency keystroke input in PromptInput.
let cachedSegmenter: Intl.Segmenter | null = null;
let cachedConstructor: typeof Intl.Segmenter | null = null;

function getSegmenter(): Intl.Segmenter | null {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
    return null;
  }
  if (cachedSegmenter && cachedConstructor === Intl.Segmenter) {
    return cachedSegmenter;
  }
  cachedConstructor = Intl.Segmenter;
  cachedSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return cachedSegmenter;
}

export function measurePromptCharacters(prompt: string) {
  const segmenter = getSegmenter();
  const segments = segmenter ? segmenter.segment(prompt) : prompt;
  let count = 0;
  for (const _segment of segments) count += 1;
  const unit = segmenter ? 'character' : 'code point';
  const shortUnit = segmenter ? 'char' : 'code point';
  return { count, label: `${count} ${unit}${count === 1 ? '' : 's'}`, shortUnit };
}
