export function serializeJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('Failed to parse JSON storage field', { raw, error });
    return fallback;
  }
}
