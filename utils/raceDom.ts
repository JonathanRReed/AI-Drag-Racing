type RaceStyleProperty = 'left' | 'opacity' | 'width';
const appliedStyles = new WeakMap<CSSStyleDeclaration, Partial<Record<RaceStyleProperty, string>>>();

/** These inline properties are owned by the race animation renderer. */
export function applyRaceStyle(style: CSSStyleDeclaration, property: RaceStyleProperty, value: string): void {
  const applied = appliedStyles.get(style);
  // CSSOM normalizes calc() and numeric values. Cache the authored value, as
  // comparing it with its browser serialization would repeat the same write.
  if (applied?.[property] === value) return;
  if (style[property] !== value) style[property] = value;
  if (applied) applied[property] = value;
  else appliedStyles.set(style, { [property]: value });
}
