import { describe, expect, test } from "bun:test";
import type { LiveChartKey, LiveFilterData } from "./playlist.js";
import {
  getOfficialChartTimeSignature,
  getOfficialChartTimes,
  OFFICIAL_CHART_KEYS,
} from "./chart-time-signature.js";

function dataWithTimes(times: Partial<Record<LiveChartKey, string | null>>) {
  return {
    tracks: [
      {
        positions: Object.fromEntries(
          OFFICIAL_CHART_KEYS.map((chartKey) => [
            chartKey,
            times[chartKey] ? { officialTime: times[chartKey] } : null,
          ]),
        ),
      },
    ],
  } as unknown as Pick<LiveFilterData, "tracks">;
}

describe("official chart time signatures", () => {
  test("includes the official time for each chart in a stable key order", () => {
    const data = dataWithTimes({
      top100: "2026.11.25 14:00",
      hot100_30: "2026.11.25 14:00",
      day: "2026.11.24",
    });

    expect(getOfficialChartTimes(data)).toEqual({
      top100: "2026.11.25 14:00",
      hot100_30: "2026.11.25 14:00",
      hot100_100: null,
      day: "2026.11.24",
      week: null,
      month: null,
    });
    expect(getOfficialChartTimeSignature(data)).toBe(
      'top100=2026.11.25 14:00|hot100_30=2026.11.25 14:00|hot100_100=|day=2026.11.24|week=|month=',
    );
  });

  test("returns no signature when no official chart time is present", () => {
    expect(getOfficialChartTimeSignature(dataWithTimes({}))).toBeNull();
  });

  test("changes when an official chart time advances", () => {
    const first = getOfficialChartTimeSignature(dataWithTimes({ top100: "2026.11.25 14:00" }));
    const next = getOfficialChartTimeSignature(dataWithTimes({ top100: "2026.11.25 15:00" }));

    expect(first).not.toBe(next);
  });
});
