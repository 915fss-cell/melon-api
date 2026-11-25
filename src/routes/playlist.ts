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
  let snapshotStatus: "saved" | "duplicate" | "missing-official-time" | "error" = "error";
  try {
    data = await addHistoricalPeakRanks(data);
    snapshotStatus = await saveLiveFilterSnapshot(data);
  } catch (error) {
    console.error(
      "Failed to enrich or save Live Filter chart snapshot:",
      error instanceof Error ? error.message : "Unknown database error",
    );
  }

  return c.json(
    { ...data, snapshotSaved: snapshotStatus === "saved", snapshotStatus },
    200,
    { "Cache-Control": "no-store" },
  );
});

export { playlist as playlistRoutes };
