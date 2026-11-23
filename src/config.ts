export interface AppConfig {
  port: number;
  enableChartPrefetch: boolean;
  prefetchIntervalMs: number;
  melonMinRequestIntervalMs: number;
}

function positiveInteger(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function booleanValue(name: string, value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be either "true" or "false"`);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: positiveInteger("PORT", env.PORT, 3000),
    enableChartPrefetch: booleanValue("ENABLE_CHART_PREFETCH", env.ENABLE_CHART_PREFETCH, false),
    prefetchIntervalMs: positiveInteger("PREFETCH_INTERVAL_MS", env.PREFETCH_INTERVAL_MS, 60000),
    melonMinRequestIntervalMs: positiveInteger("MELON_MIN_REQUEST_INTERVAL_MS", env.MELON_MIN_REQUEST_INTERVAL_MS, 1000),
  };
}
