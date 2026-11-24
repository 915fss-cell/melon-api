export const SNAPSHOT_MATCH_WINDOW_MS = 60 * 60 * 1000;

type ChartTimeSnapshot = {
  payload?: {
    tracks?: Array<{
      positions?: Record<string, { officialTime?: string | null } | null>;
    }>;
  };
};

function officialTimeValue(value: string): { timestamp: number; dateOnly: boolean; dateRange?: [number, number]; monthOnly?: boolean } | undefined {
  const dateMatches = Array.from(value.matchAll(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/g));
  const timeMatch = value.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  if (!dateMatches.length) {
    const monthMatch = value.match(/(\d{4})[.\-/](\d{1,2})\b/);
    if (!monthMatch) return undefined;
    return { timestamp: Date.parse(`${monthMatch[1]}-${monthMatch[2]!.padStart(2, "0")}-01T12:00:00+09:00`), dateOnly: true, monthOnly: true };
  }

  const toTimestamp = (match: RegExpMatchArray, hour = "12", minute = "00") => Date.parse(
    `${match[1]}-${match[2]!.padStart(2, "0")}-${match[3]!.padStart(2, "0")}T${hour}:${minute}:00+09:00`,
  );
  const first = dateMatches[0]!;
  const last = dateMatches[dateMatches.length - 1]!;
  const timestamp = toTimestamp(last, timeMatch?.[1], timeMatch?.[2]);
  const dateRange = dateMatches.length > 1
    ? [toTimestamp(first, "00", "00"), toTimestamp(last, "23", "59")] as [number, number]
    : undefined;
  return Number.isFinite(timestamp) ? { timestamp, dateOnly: !timeMatch, dateRange } : undefined;
}

export function findNearestChartSnapshot<T extends ChartTimeSnapshot>(
  snapshots: readonly T[],
  target: Date,
  chartKeys: readonly string[],
): T | undefined {
  const targetTime = target.getTime();
  if (!Number.isFinite(targetTime)) return undefined;

  let nearest: T | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const snapshot of snapshots) {
    for (const track of snapshot.payload?.tracks ?? []) {
      for (const chartKey of chartKeys) {
        const officialTime = track.positions?.[chartKey]?.officialTime;
        if (!officialTime) continue;
        const parsed = officialTimeValue(officialTime);
        if (!parsed) continue;

        const selected = new Date(targetTime);
        const chartDate = new Date(parsed.timestamp);
        const koreaDateFormatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Seoul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const sameKoreanDate = koreaDateFormatter.format(selected) === koreaDateFormatter.format(chartDate);
        const sameKoreanMonth = koreaDateFormatter.format(selected).slice(0, 7) === koreaDateFormatter.format(chartDate).slice(0, 7);
        const withinOfficialRange = parsed.dateRange !== undefined && targetTime >= parsed.dateRange[0] && targetTime <= parsed.dateRange[1];
        const dateOnlyMatch = withinOfficialRange || sameKoreanDate || (parsed.monthOnly === true && sameKoreanMonth);
        const distance = parsed.dateOnly && dateOnlyMatch ? 0 : Math.abs(parsed.timestamp - targetTime);
        if (distance > SNAPSHOT_MATCH_WINDOW_MS) continue;

        if (distance < nearestDistance) {
          nearest = snapshot;
          nearestDistance = distance;
        }
      }
    }
  }

  return nearest;
}

export function findNearestSnapshot<T extends { capturedAt: Date }>(
  snapshots: readonly T[],
  target: Date,
): T | undefined {
  const targetTime = target.getTime();
  if (!Number.isFinite(targetTime)) return undefined;

  let nearest: T | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const snapshot of snapshots) {
    const capturedAt = snapshot.capturedAt.getTime();
    if (!Number.isFinite(capturedAt)) continue;

    const distance = Math.abs(capturedAt - targetTime);
    if (distance > SNAPSHOT_MATCH_WINDOW_MS) continue;

    if (
      distance < nearestDistance ||
      (distance === nearestDistance && nearest && capturedAt < nearest.capturedAt.getTime())
    ) {
      nearest = snapshot;
      nearestDistance = distance;
    }
  }

  return nearest;
}
