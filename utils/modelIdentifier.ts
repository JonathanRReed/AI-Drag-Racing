// Presentation only. Never use these strings as model IDs, lookup keys or payloads.
const NEEDS_DETAIL = /[\\\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]/u;
const UNSAFE_PRIMARY = /[\p{Bidi_Control}\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u;
const PAGE_POINTS = 512;

function asciiEscape(value: string): string {
  let text = '';
  for (const character of value) {
    const point = character.codePointAt(0)!;
    text += character === '\\' ? '\\\\' : point < 0x20 || point > 0x7e
      ? `\\u{${point.toString(16).toUpperCase()}}` : character;
  }
  return text;
}

export function formatModelIdentifier(value: string, offset = 0) {
  // Local-history identifiers predate the request bounds. Inspect only one page,
  // not the entire string, and never split a valid surrogate pair.
  offset = Math.max(0, Math.min(value.length, Number.isFinite(offset) ? Math.floor(offset) : 0));
  if (offset > 0 && /[\uDC00-\uDFFF]/.test(value[offset] ?? '') && /[\uD800-\uDBFF]/.test(value[offset - 1])) offset--;
  let end = offset;
  for (let points = 0; end < value.length && points < PAGE_POINTS; points++) {
    end += value.codePointAt(end)! > 0xffff ? 2 : 1;
  }
  const page = value.slice(offset, end);
  const paged = offset > 0 || end < value.length;
  const needsDetail = paged || NEEDS_DETAIL.test(page);
  const authoritative = paged || UNSAFE_PRIMARY.test(page);
  const escaped = asciiEscape(page);
  return { primary: authoritative ? escaped : page, escaped, needsDetail, authoritative,
    offset, end, hasMore: end < value.length, total: value.length };
}

export function modelIdentifierText(value: string, offset = 0): string {
  const label = formatModelIdentifier(value, offset);
  return label.needsDetail
    ? `${label.authoritative ? '' : `\u2068${label.primary}\u2069 · `}Escaped representation: ${label.escaped}${label.hasMore ? ' (continued; inspect identifier pages)' : ''}`
    : label.primary;
}

export function modelIdentifierCanvasText(value: string): string {
  const label = formatModelIdentifier(value);
  if (label.needsDetail) return label.escaped + (label.hasMore ? '… (continued in identifier mapping)' : '');
  // These isolation marks are authored presentation, never original ID content.
  // Original bidi controls take the escaped-only branch above.
  return /\P{ASCII}/u.test(label.primary) ? `\u2068${label.primary}\u2069` : label.primary;
}

export function matchesModelIdentifier(value: string, query: string): boolean {
  // Search the literal query, never interpret typed escape syntax as an ID.
  const needle = query.toLowerCase();
  return value.toLowerCase().includes(needle) || formatModelIdentifier(value).escaped.toLowerCase().includes(needle);
}
