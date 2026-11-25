import { describe, expect, test } from "bun:test";
import type { LiveChartKey, LiveFilterData } from "./playlist.js";
import {
  getChangedOfficialChartKeys,
  getOfficialChartTimeSignature,
  getOfficialChartTimes,
  mergeOfficialChartTimes,
  OFFICIAL_CHART_KEYS,
  parseOfficialChartTimeSignature,
  retainOnlyUpdatedChartPositions,
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

  test("uses source chart times even when no playlist tracks match", () => {
    const data = {
      tracks: [],
      officialChartTimes: {
        top100: "2026.11.25 22:00",
        day: "2026.11.24",
      },
    };

    expect(getOfficialChartTimes(data)).toEqual({
      top100: "2026.11.25 22:00",
      hot100_30: null,
      hot100_100: null,
      day: "2026.11.24",
      week: null,
      month: null,
    });
  });

  test("changes when an official chart time advances", () => {
    const first = getOfficialChartTimeSignature(dataWithTimes({ top100: "2026.11.25 14:00" }));
    const next = getOfficialChartTimeSignature(dataWithTimes({ top100: "2026.11.25 15:00" }));

    expect(first).not.toBe(next);
  });

  test("detects only the chart whose official time changed", () => {
    const previous = parseOfficialChartTimeSignature(
      "top100=2026.11.25 20:00|hot100_30=2026.11.25 20:00|hot100_100=|day=2026.11.24|week=2026.11.16 ~ 2026.11.22|month=",
    );
    const current = getOfficialChartTimes(dataWithTimes({
      top100: "2026.11.25 21:00",
      hot100_30: "2026.11.25 20:00",
      day: "2026.11.24",
      week: "2026.11.16 ~ 2026.11.22",
    }));

    expect(getChangedOfficialChartKeys(current, previous)).toEqual(["top100"]);
  });

  test("detects the next daily update and keeps the prior time if that chart is unavailable", () => {
    const previous = parseOfficialChartTimeSignature(
      "top100=2026.11.25 20:00|hot100_30=|hot100_100=|day=2026.11.24|week=|month=",
    );
    const nextDay = getOfficialChartTimes(dataWithTimes({ day: "2026.11.25" }));
    const unavailable = getOfficialChartTimes(dataWithTimes({ top100: "2026.11.25 21:00" }));

    expect(getChangedOfficialChartKeys(nextDay, previous)).toEqual(["day"]);
    expect(mergeOfficialChartTimes(unavailable, previous).day).toBe("2026.11.24");
  });

  test("retains positions only for charts with a new official time", () => {
    const data = dataWithTimes({ top100: "2026.11.25 21:00", day: "2026.11.24" }) as LiveFilterData;
    const pruned = retainOnlyUpdatedChartPositions(data, ["top100"]);

    expect(Object.keys(pruned.tracks[0]!.positions)).toEqual(["top100"]);
  });
});
