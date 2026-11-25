import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { liveFilterSnapshots } from "../db/schema.js";
import type { LiveChartKey, LiveChartPosition, LiveFilterData } from "./playlist.js";
import {
  getChangedOfficialChartKeys,
  getOfficialChartTimes,
  mergeOfficialChartTimes,
  parseOfficialChartTimeSignature,
  retainOnlyUpdatedChartPositions,
  serializeOfficialChartTimes,
} from "./chart-time-signature.js";

const chartKeys: LiveChartKey[] = ["top100", "hot100_30", "hot100_100", "day", "week", "month"];

export async function addHistoricalPeakRanks(data: LiveFilterData): Promise<LiveFilterData> {
  const latestSnapshots = await db
    .select({ payload: liveFilterSnapshots.payload })
    .from(liveFilterSnapshots)
    .where(eq(liveFilterSnapshots.playlistId, data.playlistId))
    .orderBy(desc(liveFilterSnapshots.capturedAt), desc(liveFilterSnapshots.id))
    .limit(1);
  const latestHasCumulativePeaks = latestSnapshots[0]?.payload.tracks?.some(
    (track) => track.peakRanks !== undefined,
  );
  const snapshots = latestHasCumulativePeaks
    ? latestSnapshots
    : await db
        .select({ payload: liveFilterSnapshots.payload })
        .from(liveFilterSnapshots)
        .where(eq(liveFilterSnapshots.playlistId, data.playlistId));
  const peakRanks = new Map<string, Map<LiveChartKey, number>>();

  for (const snapshot of snapshots) {
    for (const track of snapshot.payload.tracks ?? []) {
      if (!track.songId) continue;
      for (const chartKey of chartKeys) {
        const position = track.positions?.[chartKey];
        const candidates = [
          track.peakRanks?.[chartKey],
          position?.peakRank,
          position ? Number.parseInt(position.rank, 10) : null,
        ].filter((rank): rank is number => typeof rank === "number" && Number.isInteger(rank) && rank > 0);
        if (!candidates.length) continue;

        let trackPeaks = peakRanks.get(track.songId);
        if (!trackPeaks) {
          trackPeaks = new Map();
          peakRanks.set(track.songId, trackPeaks);
        }
        const observedPeak = Math.min(...candidates);
        const previousPeak = trackPeaks.get(chartKey);
        trackPeaks.set(chartKey, previousPeak === undefined ? observedPeak : Math.min(previousPeak, observedPeak));
      }
    }
  }

  return {
    ...data,
    tracks: data.tracks.map((track) => {
      const positions = { ...track.positions };
      const trackPeakRanks = { ...track.peakRanks };
      for (const chartKey of chartKeys) {
        const position = positions[chartKey];
        const currentRank = position ? Number.parseInt(position.rank, 10) : Number.NaN;
        const historicalPeak = track.songId ? peakRanks.get(track.songId)?.get(chartKey) : undefined;
        const peakRank = Number.isFinite(currentRank)
          ? historicalPeak === undefined ? currentRank : Math.min(currentRank, historicalPeak)
          : historicalPeak ?? null;

        trackPeakRanks[chartKey] = peakRank;
        if (position) {
          positions[chartKey] = {
            ...position,
            movement: position.movement ?? position.rankChange,
            peakRank,
          } satisfies LiveChartPosition;
        }
      }
      return { ...track, positions, peakRanks: trackPeakRanks };
    }),
  };
}

export type LiveFilterSnapshotSaveResult = "saved" | "duplicate" | "missing-official-time";

export async function saveLiveFilterSnapshot(
  data: LiveFilterData,
): Promise<LiveFilterSnapshotSaveResult> {
  const currentTimes = getOfficialChartTimes(data);
  if (!Object.values(currentTimes).some(Boolean)) return "missing-official-time";

  const [latestSnapshot] = await db
    .select({ signature: liveFilterSnapshots.officialTimeSignature })
    .from(liveFilterSnapshots)
    .where(eq(liveFilterSnapshots.playlistId, data.playlistId))
    .orderBy(desc(liveFilterSnapshots.capturedAt), desc(liveFilterSnapshots.id))
    .limit(1);
  const previousTimes = parseOfficialChartTimeSignature(latestSnapshot?.signature);
  const updatedChartKeys = getChangedOfficialChartKeys(currentTimes, previousTimes);
  if (!updatedChartKeys.length) return "duplicate";

  const officialTimeSignature = serializeOfficialChartTimes(
    mergeOfficialChartTimes(currentTimes, previousTimes),
  );
  if (!officialTimeSignature) return "missing-official-time";

  const payload = retainOnlyUpdatedChartPositions(data, updatedChartKeys);
  const inserted = await db
    .insert(liveFilterSnapshots)
    .values({
      playlistId: data.playlistId,
      officialTimeSignature,
      payload,
    })
    .onConflictDoNothing({
      target: [liveFilterSnapshots.playlistId, liveFilterSnapshots.officialTimeSignature],
    })
    .returning({ id: liveFilterSnapshots.id });

  return inserted.length > 0 ? "saved" : "duplicate";
}
