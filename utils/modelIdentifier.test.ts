import { describe, expect, it } from 'vitest';
import { formatModelIdentifier, modelIdentifierText, matchesModelIdentifier, modelIdentifierCanvasText } from './modelIdentifier';

function decodeEscaped(text: string): string {
  return text.replace(/\\(?:\\|u\{([0-9A-F]+)\})/g, (_, hex: string | undefined) => hex ? String.fromCodePoint(parseInt(hex, 16)) : '\\');
}

describe('model identifier presentation', () => {
  it.each(['gpt-4o', 'Model', 'model', 'café', 'cafe\u0301', 'vendor/模型:β+q4#tag', 'نماذج'])('keeps ordinary identifier %s unchanged', value => {
    const label = formatModelIdentifier(value);
    expect(label.primary).toBe(value);
    expect(label.needsDetail).toBe(false);
    expect(modelIdentifierText(value)).toBe(value);
  });

  it.each(['\u202e', '\u2066', '\u2069', '\u061c', '\u200f', '\u0000', '\u0085', '\n', '\u2028', '\u2029', '\ud800', '\udfff'])('never presents dangerous character %j raw', control => {
    const label = formatModelIdentifier(`a${control}b`);
    expect(label.authoritative).toBe(true);
    expect(label.primary).not.toContain(control);
    expect(label.escaped).toMatch(/^a\\u\{[0-9A-F]+\}b$/);
    expect(decodeEscaped(label.escaped)).toBe(`a${control}b`);
  });

  it.each(['org/می\u200cروم', 'org/क्\u200dष', 'org/👩\u200d💻', 'org/✈\ufe0f', 'org/🏴\u{e0067}\u{e0062}\u{e007f}', 'org/\u0600id', 'gpt\u200b-4o', 'a\u034fb'])('preserves safe primary shaping with ASCII technical detail for %s', value => {
    const label = formatModelIdentifier(value);
    expect(label.primary).toBe(value);
    expect(label.authoritative).toBe(false);
    expect(label.needsDetail).toBe(true);
    expect(label.escaped).toMatch(/^[\x20-\x7e]*$/);
    expect(decodeEscaped(label.escaped)).toBe(value);
  });

  it('distinguishes actual characters from literal escape-looking identifiers', () => {
    const values = ['x\u200by', 'x\\u{200B}y', 'x\\\\u{200B}y', 'x\u202ey', 'x\\u{202E}y'];
    const labels = values.map(v => formatModelIdentifier(v).escaped);
    expect(new Set(labels).size).toBe(values.length);
    expect(labels[0]).toBe('x\\u{200B}y');
    expect(labels[1]).toBe('x\\\\u{200B}y');
    expect(labels.map(decodeEscaped)).toEqual(values);
  });

  it('matches raw and displayed literal substrings without parsing query escapes', () => {
    expect(matchesModelIdentifier('x\u200by', '\u200b')).toBe(true);
    expect(matchesModelIdentifier('x\u200by', '\\u{200b}')).toBe(true);
    expect(matchesModelIdentifier('x\\u{200B}y', '\u200b')).toBe(false);
    expect(matchesModelIdentifier('x\u200by', '\\u200b')).toBe(false);
    expect(matchesModelIdentifier('Plain', 'PLAIN')).toBe(true);
  });

  it('bounds long legacy values and never splits a surrogate pair at a page boundary', () => {
    const value = 'a'.repeat(511) + '😀' + '\u202e' + 'z'.repeat(1000000);
    const first = formatModelIdentifier(value);
    expect(first.end).toBe(513);
    expect(first.primary.endsWith('\\u{1F600}')).toBe(true);
    expect(first.authoritative).toBe(true);
    expect(first.escaped.length).toBeLessThanOrEqual(5120);
    const second = formatModelIdentifier(value, first.end);
    expect(second.offset).toBe(513);
    expect(second.escaped.startsWith('\\u{202E}')).toBe(true);
    expect(second.end - second.offset).toBe(512);
    expect(formatModelIdentifier('a'.repeat(512)).hasMore).toBe(false);
    expect(formatModelIdentifier('a'.repeat(513)).hasMore).toBe(true);
  });

  it('includes legitimate shaped primary labels in safe accessible names', () => {
    expect(modelIdentifierText('org/👩\u200d💻')).toBe('\u2068org/👩\u200d💻\u2069 · Escaped representation: org/\\u{1F469}\\u{200D}\\u{1F4BB}');
    expect(modelIdentifierText('a\u2068b')).toBe('Escaped representation: a\\u{2068}b');
  });

  it('round trips every UTF-16 code unit, including all controls and surrogate halves', () => {
    for (let unit = 0; unit <= 0xffff; unit++) {
      const raw = String.fromCharCode(unit) + '\\';
      expect(decodeEscaped(formatModelIdentifier(raw).escaped), `unit ${unit}`).toBe(raw);
    }
  });

  it('preserves ordinary canvas text, isolates Unicode and escapes original controls distinctly', () => {
    expect(modelIdentifierCanvasText('gpt-4o')).toBe('gpt-4o');
    expect(modelIdentifierCanvasText('org/模型')).toBe('\u2068org/模型\u2069');
    expect(modelIdentifierCanvasText('x\\u{200B}')).toBe('x\\\\u{200B}');
    expect(modelIdentifierCanvasText('\u2068org/模型\u2069')).toBe('\\u{2068}org/\\u{6A21}\\u{578B}\\u{2069}');
  });
});
