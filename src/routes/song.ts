import { Hono } from "hono";
import { getSongData } from "../services/song.js";
import { apiError } from "../utils/api-error.js";

const song = new Hono();

song.get("/:songId", async (c) => {
  const songId = c.req.param("songId");

  if (!songId || !/^\d+$/.test(songId)) {
    return apiError(c, 400, "INVALID_SONG_ID", "Song ID must be numeric.");
  }

  const result = await getSongData(songId);

  return result.match(
    (data) => c.json(data),
    (error) => {
      const notFound = error.message.startsWith("Song not found:");
      return apiError(
        c,
        notFound ? 404 : 502,
        notFound ? "SONG_NOT_FOUND" : "UPSTREAM_ERROR",
        notFound ? "The requested song was not found." : "Song data is temporarily unavailable."
      );
    }
  );
});

export { song as songRoutes };
