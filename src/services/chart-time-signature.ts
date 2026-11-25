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

export function getOfficialChartTimeSignature(data: TracksOnly): string | null {
  const times = getOfficialChartTimes(data);
  if (!Object.values(times).some(Boolean)) return null;
  return OFFICIAL_CHART_KEYS.map((chartKey) => `${chartKey}=${times[chartKey] ?? ""}`).join("|");
}
