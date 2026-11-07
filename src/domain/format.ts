/** Small formatting helpers. */

/** 0.3333 → "0.33", 2 → "2" */
export function trimNum(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function newId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
