const appliedFilters = new WeakMap<Pick<SVGPathElement, 'style'>, string>();

/** Only this renderer owns a lane's inline filter. */
export function applyPaceFilter(path: Pick<SVGPathElement, 'style'>, filter: string): void {
  // CSSOM rewrites colors and lengths, so comparing its serialization to the
  // authored value would repeat the same assignment on every animation frame.
  if (appliedFilters.get(path) === filter) return;
  path.style.filter = filter;
  appliedFilters.set(path, filter);
}
