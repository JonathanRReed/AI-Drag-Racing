export function measurePromptCharacters(prompt: string) {
  const supportsGraphemes = typeof Intl.Segmenter === 'function';
  const segments = supportsGraphemes
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(prompt)
    : prompt;
  let count = 0;
  for (const _segment of segments) count += 1;
  const unit = supportsGraphemes ? 'character' : 'code point';
  const shortUnit = supportsGraphemes ? 'char' : 'code point';
  return { count, label: `${count} ${unit}${count === 1 ? '' : 's'}`, shortUnit };
}
