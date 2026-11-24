import { createHash } from "node:crypto";
import { db } from "../db/index.js";
import { liveFilterSnapshots } from "../db/schema.js";
import type { LiveFilterData } from "./playlist.js";

export async function saveLiveFilterSnapshot(data: LiveFilterData): Promise<void> {
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        playlistId: data.playlistId,
        tracks: data.tracks,
        unavailableCharts: data.unavailableCharts,
      }),
    )
    .digest("hex");

  await db
    .insert(liveFilterSnapshots)
    .values({
      playlistId: data.playlistId,
      snapshotHash: fingerprint,
      payload: data,
    })
    .onConflictDoNothing({
      target: [liveFilterSnapshots.playlistId, liveFilterSnapshots.snapshotHash],
    });
}
