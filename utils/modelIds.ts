const controls = new RegExp(String.raw`[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]`, 'u');
const graphic = new RegExp(String.raw`[\p{L}\p{N}\p{P}\p{S}]`, 'u');
const ignorable = new RegExp(String.raw`\p{Default_Ignorable_Code_Point}`, 'u');
const mark = new RegExp(String.raw`\p{M}`, 'u');
const isGraphic = (point: string) => graphic.test(point) && !ignorable.test(point);

// Opaque application IDs: preserve exact values, with graphic content and no
// controls/non-joiner formats. Joiners need graphic neighbors, ignoring marks.
// Embedded a+ZWJ+b is allowed; this does not promise linguistic/visual uniqueness.
export function isAcceptedModelId(id: unknown): id is string {
  if (typeof id !== 'string' || !id || id.length > 512 || id !== id.trim()) return false;
  const points = Array.from(id);
  if (!points.some(isGraphic)) return false;
  for (let i = 0; i < points.length; i++) {
    if (points[i] === '\u200c' || points[i] === '\u200d') {
      let left = i - 1;
      let right = i + 1;
      while (left >= 0 && mark.test(points[left])) left--;
      while (right < points.length && mark.test(points[right])) right++;
      if (!isGraphic(points[left] || '') || !isGraphic(points[right] || '')) return false;
    } else if (controls.test(points[i])) return false;
  }
  return true;
}

export function filterModelIds(value: unknown): string[] {
  return Array.isArray(value) ? Array.from(new Set(value.filter(isAcceptedModelId))) : [];
}
