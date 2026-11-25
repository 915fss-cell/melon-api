import type { LiveChartKey, LiveFilterData } from "./playlist.js";

export const OFFICIAL_CHART_KEYS: readonly LiveChartKey[] = [
  "top100",
  "hot100_30",
  "hot100_100",
  "day",
  "week",
  "month",
];

export type OfficialChartTimes = Record<LiveChartKey, string | null>;
type TracksOnly = Pick<LiveFilterData, "tracks">;

export function getOfficialChartTimes(data: TracksOnly): OfficialChartTimes {
  return Object.fromEntries(
    OFFICIAL_CHART_KEYS.map((chartKey) => {
      const officialTime = data.tracks
        .map((track) => track.positions?.[chartKey]?.officialTime)
        .find((value): value is string => typeof value === "string" && value.trim().length > 0);

      return [chartKey, officialTime?.trim() ?? null];
    }),
  ) as OfficialChartTimes;
}

export function parseOfficialChartTimeSignature(signature: string | null | undefined): OfficialChartTimes {
  const times = Object.fromEntries(OFFICIAL_CHART_KEYS.map((key) => [key, null])) as OfficialChartTimes;
  if (!signature) return times;

  for (const part of signature.split("|")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const chartKey = part.slice(0, separator) as LiveChartKey;
    if (!OFFICIAL_CHART_KEYS.includes(chartKey)) continue;
    times[chartKey] = part.slice(separator + 1).trim() || null;
  }

  return times;
}

export function serializeOfficialChartTimes(times: OfficialChartTimes): string | null {
  if (!Object.values(times).some(Boolean)) return null;
  return OFFICIAL_CHART_KEYS.map((chartKey) => `${chartKey}=${times[chartKey] ?? ""}`).join("|");
}

export function getChangedOfficialChartKeys(
  current: OfficialChartTimes,
  previous: OfficialChartTimes,
): LiveChartKey[] {
  return OFFICIAL_CHART_KEYS.filter(
    (chartKey) => current[chartKey] !== null && current[chartKey] !== previous[chartKey],
  );
}

export function mergeOfficialChartTimes(
  current: OfficialChartTimes,
  previous: OfficialChartTimes,
): OfficialChartTimes {
  return Object.fromEntries(
    OFFICIAL_CHART_KEYS.map((chartKey) => [chartKey, current[chartKey] ?? previous[chartKey]]),
  ) as OfficialChartTimes;
}

export function retainOnlyUpdatedChartPositions(
  data: LiveFilterData,
  updatedChartKeys: readonly LiveChartKey[],
): LiveFilterData {
  const updatedKeys = new Set(updatedChartKeys);
  return {
    ...data,
    tracks: data.tracks.map((track) => {
      const positions = { ...track.positions };
      for (const chartKey of OFFICIAL_CHART_KEYS) {
        if (!updatedKeys.has(chartKey)) delete positions[chartKey];
      }
      return { ...track, positions };
    }),
  };
}

export function getOfficialChartTimeSignature(data: TracksOnly): string | null {
  return serializeOfficialChartTimes(getOfficialChartTimes(data));
}
