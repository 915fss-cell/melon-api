import { Hono } from "hono";
import { getAlbumData } from "../services/album.js";
import { apiError } from "../utils/api-error.js";

const album = new Hono();

album.get("/:albumId", async (c) => {
  const albumId = c.req.param("albumId");

  if (!albumId || !/^\d+$/.test(albumId)) {
    return apiError(c, 400, "INVALID_ALBUM_ID", "Album ID must be numeric.");
  }

  const result = await getAlbumData(albumId);

  return result.match(
    (data) => c.json(data),
    (error) => {
      const notFound = error.message.startsWith("Album not found:");
      return apiError(
        c,
        notFound ? 404 : 502,
        notFound ? "ALBUM_NOT_FOUND" : "UPSTREAM_ERROR",
        notFound ? "The requested album was not found." : "Album data is temporarily unavailable."
      );
    }
  );
});

export { album as albumRoutes };
