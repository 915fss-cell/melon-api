import { Hono } from "hono";
import { chartRoutes } from "./chart.js";
import { songRoutes } from "./song.js";
import { albumRoutes } from "./album.js";
import { playlistRoutes } from "./playlist.js";

const routes = new Hono();

routes.route("/chart", chartRoutes);
routes.route("/song", songRoutes);
routes.route("/album", albumRoutes);
routes.route("/playlist", playlistRoutes);

export { chartRoutes, songRoutes, albumRoutes, playlistRoutes };
export default routes;
