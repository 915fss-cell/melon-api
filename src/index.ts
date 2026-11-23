import { Hono } from "hono";
import routes from "@/routes";
import { chartPrefetcher } from "@/utils/prefetch";
import { loadConfig } from "@/config";
import { ApiError, apiError } from "@/utils/api-error";

const config = loadConfig();
const app = new Hono();

app.use("*", async (c, next) => {
  const startedAt = performance.now();
  await next();
  console.info(`${c.req.method} ${c.req.path} ${c.res.status} ${Math.round(performance.now() - startedAt)}ms`);
});

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return apiError(c, error.status, error.code, error.message);
  }
  console.error("Unhandled API error:", error.message);
  return apiError(c, 500, "INTERNAL_ERROR", "The request could not be completed.");
});

app.notFound((c) => apiError(c, 404, "NOT_FOUND", "The requested endpoint was not found."));

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/api", routes);

app.get("/", (c) => c.json({
  message: "Melon Music API",
  endpoints: [
    "/health",
    "/api/chart/top100",
    "/api/chart/hot100",
    "/api/chart/day",
    "/api/chart/week",
    "/api/chart/month",
    "/api/song/:songId",
    "/api/album/:albumId",
  ],
}));

if (config.enableChartPrefetch) {
  chartPrefetcher.updateConfig({
    enabled: true,
    intervalMs: config.prefetchIntervalMs,
    onSuccess: (type) => console.log(`[Prefetch] Chart data updated: ${type}`),
    onError: (type, error) => console.error(`[Prefetch] Failed to update ${type} chart:`, error.message),
  });
  chartPrefetcher.start();

  const shutdownHandler = () => {
    chartPrefetcher.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdownHandler);
  process.on("SIGTERM", shutdownHandler);
}

export default app;
