import { Hono } from "hono";
import { getLiveFilterData } from "../services/playlist.js";
import { apiError } from "../utils/api-error.js";

const playlist = new Hono();

playlist.get("/live-filter", async (c) => {
  const result = await getLiveFilterData();
  return result.match(
    (data) => c.json(data, 200, { "Cache-Control": "no-store" }),
    () => apiError(c, 502, "UPSTREAM_ERROR", "The Melon playlist is temporarily unavailable.")
  );
});

export { playlist as playlistRoutes };
