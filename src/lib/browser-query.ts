export function queryParams(search: { forEach(callback: (value: string, key: string) => void): void }) {
  const params: Record<string, string | string[]> = {};
  search.forEach((value, key) => {
    const old = params[key];
    params[key] = old === undefined ? value : Array.isArray(old) ? [...old, value] : [old, value];
  });
  return params;
}
