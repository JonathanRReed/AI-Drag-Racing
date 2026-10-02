/** Only this renderer owns a lane's inline filter. */
export function applyPaceFilter(path: Pick<SVGPathElement, 'style'>, filter: string): void {
  if (path.style.filter !== filter) path.style.filter = filter;
}
