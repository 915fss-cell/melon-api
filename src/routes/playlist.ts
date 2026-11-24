import { Hono } from "hono";
import { getLiveFilterData } from "../services/playlist.js";
import { addHistoricalPeakRanks, saveLiveFilterSnapshot } from "../services/live-filter-snapshots.js";
import { apiError } from "../utils/api-error.js";

const playlist = new Hono();

playlist.get("/live-filter", async (c) => {
  const result = await getLiveFilterData();
  if (result.isErr()) {
    return apiError(c, 502, "UPSTREAM_ERROR", "The Melon playlist is temporarily unavailable.");
  }

  let data = result.value;
  let snapshotSaved = true;
  try {
    data = await addHistoricalPeakRanks(data);
    await saveLiveFilterSnapshot(data);
  } catch (error) {
    snapshotSaved = false;
    console.error(
      "Failed to enrich or save Live Filter chart snapshot:",
      error instanceof Error ? error.message : "Unknown database error",
    );
  }

  return c.json(
    { ...data, snapshotSaved },
    200,
    { "Cache-Control": "no-store" },
  );
});

export { playlist as playlistRoutes };
