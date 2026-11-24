import { and, asc, desc, eq, gt, gte, lt, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { liveFilterSnapshots } from "../db/schema.js";
import { findNearestChartSnapshot } from "./snapshot-selection.js";
import type { LiveChartKey, LiveChartPosition, LiveFilterData } from "./playlist.js";

export const HISTORY_CHARTS: Array<{ key: LiveChartKey; label: string }> = [
  { key: "top100", label: "Top 100" },
  { key: "hot100_30", label: "Hot 100 · 30d" },
  { key: "hot100_100", label: "Hot 100 · 100d" },
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
];

const chartKeys = HISTORY_CHARTS.map((chart) => chart.key);
const snapshotPageSize = 500;
const playlistId = "529294115";
type RankMovement = LiveChartPosition["movement"];

type Snapshot = {
  id: number;
  capturedAt: Date;
  payload: LiveFilterData;
};

export interface ChartHistoryEntry {
  id: string;
  snapshotId: number;
  capturedAt: string;
  songId: string;
  title: string;
  artists: string[];
  album: string;
  imageUrl: string;
  chartKey: LiveChartKey;
  chartLabel: string;
  rank: number;
  previousRank: number | null;
  rankDelta: number | null;
  melonMovement: RankMovement | null;
  peakRank: number | null;
  officialTime: string | null;
}

export interface ChartHistoryOptions {
  from: Date;
  toExclusive: Date;
  chart: LiveChartKey | "all";
  search: string;
  songId?: string;
  sort: "date_desc" | "date_asc" | "rank_asc" | "rank_desc";
  page: number;
  pageSize: number;
  snapshotMode?: boolean;
  snapshotAt?: Date;
}

function pairKey(songId: string, chartKey: LiveChartKey): string {
  return songId + ":" + chartKey;
}

function rankValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const rank = Number.parseInt(value, 10);
  return Number.isInteger(rank) && rank > 0 ? rank : null;
}

function selectedCharts(chart: ChartHistoryOptions["chart"]): LiveChartKey[] {
  return chart === "all" ? chartKeys : [chart];
}

function matchesSearch(
  track: LiveFilterData["tracks"][number],
  options: ChartHistoryOptions,
): boolean {
  if (options.songId && track.songId !== options.songId) return false;
  const search = options.search.trim().toLocaleLowerCase();
  if (!search) return true;
  return [track.title, ...(track.artists ?? [])]
    .join(" ")
    .toLocaleLowerCase()
    .includes(search);
}

async function readRange(from: Date, toExclusive: Date): Promise<Snapshot[]> {
  const snapshots: Snapshot[] = [];
  let cursor: { capturedAt: Date; id: number } | undefined;

  while (true) {
    const cursorCondition = cursor
      ? or(
          gt(liveFilterSnapshots.capturedAt, cursor.capturedAt),
          and(
            eq(liveFilterSnapshots.capturedAt, cursor.capturedAt),
            gt(liveFilterSnapshots.id, cursor.id),
          ),
        )
      : undefined;
    const batch = await db
      .select({
        id: liveFilterSnapshots.id,
        capturedAt: liveFilterSnapshots.capturedAt,
        payload: liveFilterSnapshots.payload,
      })
      .from(liveFilterSnapshots)
      .where(
        and(
          eq(liveFilterSnapshots.playlistId, playlistId),
          gte(liveFilterSnapshots.capturedAt, from),
          lt(liveFilterSnapshots.capturedAt, toExclusive),
          cursorCondition,
        ),
      )
      .orderBy(asc(liveFilterSnapshots.capturedAt), asc(liveFilterSnapshots.id))
      .limit(snapshotPageSize);

    if (!batch.length) break;
    snapshots.push(...batch);
    const last = batch[batch.length - 1]!;
    cursor = { capturedAt: last.capturedAt, id: last.id };
    if (batch.length < snapshotPageSize) break;
  }

  return snapshots;
}

async function readPriorRanks(
  from: Date,
  targetPairs: Set<string>,
): Promise<Map<string, number | null>> {
  const priorRanks = new Map<string, number | null>();
  if (!targetPairs.size) return priorRanks;

  let cursor: { capturedAt: Date; id: number } | undefined;
  while (priorRanks.size < targetPairs.size) {
    const cursorCondition = cursor
      ? or(
          lt(liveFilterSnapshots.capturedAt, cursor.capturedAt),
          and(
            eq(liveFilterSnapshots.capturedAt, cursor.capturedAt),
            lt(liveFilterSnapshots.id, cursor.id),
          ),
        )
      : undefined;
    const batch = await db
      .select({
        id: liveFilterSnapshots.id,
        capturedAt: liveFilterSnapshots.capturedAt,
        payload: liveFilterSnapshots.payload,
      })
      .from(liveFilterSnapshots)
      .where(
        and(
          eq(liveFilterSnapshots.playlistId, playlistId),
          lt(liveFilterSnapshots.capturedAt, from),
          cursorCondition,
        ),
      )
      .orderBy(desc(liveFilterSnapshots.capturedAt), desc(liveFilterSnapshots.id))
      .limit(snapshotPageSize);

    if (!batch.length) break;
    for (const snapshot of batch) {
      for (const track of snapshot.payload?.tracks ?? []) {
        if (!track.songId) continue;
        for (const chartKey of chartKeys) {
          const key = pairKey(track.songId, chartKey);
          const chartLabel = HISTORY_CHARTS.find((item) => item.key === chartKey)!.label;
          if (
            !targetPairs.has(key) ||
            priorRanks.has(key) ||
            snapshot.payload.unavailableCharts?.includes(chartLabel)
          ) continue;
          priorRanks.set(key, rankValue(track.positions?.[chartKey]?.rank));
        }
      }
    }
    const last = batch[batch.length - 1]!;
    cursor = { capturedAt: last.capturedAt, id: last.id };
    if (batch.length < snapshotPageSize) break;
  }

  return priorRanks;
}

export async function getChartHistory(options: ChartHistoryOptions) {
  const rangeSnapshots = options.snapshotMode && options.snapshotAt
    ? await readRange(new Date("2000-01-01T00:00:00.000Z"), new Date("2100-01-01T00:00:00.000Z"))
    : await readRange(options.from, options.toExclusive);
  const selectedSnapshot = options.snapshotMode && options.snapshotAt
    ? findNearestChartSnapshot(rangeSnapshots, options.snapshotAt, selectedCharts(options.chart))
    : undefined;
  const snapshots = options.snapshotMode
    ? selectedSnapshot ? [selectedSnapshot] : []
    : rangeSnapshots;
  const charts = selectedCharts(options.chart);
  const targetPairs = new Set<string>();

  for (const snapshot of snapshots) {
    for (const track of snapshot.payload?.tracks ?? []) {
      if (!track.songId || !matchesSearch(track, options)) continue;
      for (const chartKey of charts) {
        if (rankValue(track.positions?.[chartKey]?.rank) !== null) {
          targetPairs.add(pairKey(track.songId, chartKey));
        }
      }
    }
  }

  const priorRanksFrom = options.snapshotMode && selectedSnapshot
    ? selectedSnapshot.capturedAt
    : options.from;
  const lastRanks = await readPriorRanks(priorRanksFrom, targetPairs);
  const entries: ChartHistoryEntry[] = [];

  for (const snapshot of snapshots) {
    for (const track of snapshot.payload?.tracks ?? []) {
      if (!track.songId || !matchesSearch(track, options)) continue;
      for (const chartKey of charts) {
        const chartLabel = HISTORY_CHARTS.find((item) => item.key === chartKey)!.label;
        if (snapshot.payload.unavailableCharts?.includes(chartLabel)) continue;
        const position = track.positions?.[chartKey];
        const rank = rankValue(position?.rank);
        const key = pairKey(track.songId, chartKey);
        if (rank === null) {
          if (targetPairs.has(key)) lastRanks.set(key, null);
          continue;
        }

        if (!targetPairs.has(key)) continue;
        const previousRank = lastRanks.get(key) ?? null;
        const rankDelta = previousRank === null ? null : previousRank - rank;
        lastRanks.set(key, rank);
        entries.push({
          id: snapshot.id + ":" + chartKey + ":" + track.songId,
          snapshotId: snapshot.id,
          capturedAt: snapshot.capturedAt.toISOString(),
          songId: track.songId,
          title: track.title || "Untitled track",
          artists: Array.isArray(track.artists) ? track.artists.filter(Boolean) : [],
          album: track.album || "",
          imageUrl: track.imageUrl || "",
          chartKey,
          chartLabel,
          rank,
          previousRank,
          rankDelta,
          melonMovement: position?.movement ?? position?.rankChange ?? null,
          peakRank: track.peakRanks?.[chartKey] ?? position?.peakRank ?? null,
          officialTime: position?.officialTime ?? null,
        });
      }
    }
  }

  entries.sort((left, right) => {
    if (options.sort === "date_asc") {
      return left.capturedAt.localeCompare(right.capturedAt) || left.rank - right.rank;
    }
    if (options.sort === "rank_asc") {
      return left.rank - right.rank || right.capturedAt.localeCompare(left.capturedAt);
    }
    if (options.sort === "rank_desc") {
      return right.rank - left.rank || right.capturedAt.localeCompare(left.capturedAt);
    }
    return right.capturedAt.localeCompare(left.capturedAt) || left.rank - right.rank;
  });

  const total = entries.length;
  const start = (options.page - 1) * options.pageSize;
  const rows = entries.slice(start, start + options.pageSize);
  const trackSeries = options.songId
    ? entries
        .filter((entry) => entry.songId === options.songId)
        .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))
        .slice(-1000)
    : [];
  const uniqueTracks = new Set(entries.map((entry) => entry.songId));
  const snapshotTracks = selectedSnapshot
    ? (selectedSnapshot.payload?.tracks ?? []).filter((track) =>
        track.songId &&
        matchesSearch(track, options) &&
        charts.some((chartKey) => rankValue(track.positions?.[chartKey]?.rank) !== null &&
          !selectedSnapshot.payload.unavailableCharts?.includes(HISTORY_CHARTS.find((chart) => chart.key === chartKey)!.label)),
      )
    : [];
  const oldest = entries.reduce<string | null>(
    (value, entry) => value === null || entry.capturedAt < value ? entry.capturedAt : value,
    null,
  );
  const newest = entries.reduce<string | null>(
    (value, entry) => value === null || entry.capturedAt > value ? entry.capturedAt : value,
    null,
  );

  return {
    rows,
    total,
    page: options.page,
    pageSize: options.pageSize,
    pageCount: Math.ceil(total / options.pageSize),
    trackCount: uniqueTracks.size,
    oldest,
    newest,
    market: { code: "KR", label: "South Korea · Melon" },
    trackSeries,
    snapshot: selectedSnapshot
      ? {
          capturedAt: selectedSnapshot.capturedAt.toISOString(),
          tracks: snapshotTracks,
          unavailableCharts: selectedSnapshot.payload.unavailableCharts ?? [],
        }
      : null,
  };
}
