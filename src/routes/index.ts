import { Hono } from "hono";
import { chartRoutes } from "./chart.js";
import { songRoutes } from "./song.js";
import { albumRoutes } from "./album.js";

const routes = new Hono();

routes.route("/chart", chartRoutes);
routes.route("/song", songRoutes);
routes.route("/album", albumRoutes);

export { chartRoutes, songRoutes, albumRoutes };
export default routes;
