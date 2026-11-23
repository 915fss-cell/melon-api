import { Hono } from "hono";
import routes from "./routes/index.js";
import { chartPrefetcher } from "./utils/prefetch.js";
import { loadConfig } from "./config.js";
import { ApiError, apiError } from "./utils/api-error.js";
import { dashboardClient } from "./frontend/client.js";
import { dashboardPage } from "./frontend/page.js";
import { dashboardStyles } from "./frontend/styles.js";

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

app.get("/app.css", (c) => c.body(dashboardStyles, 200, {
  "Content-Type": "text/css; charset=utf-8",
  "Cache-Control": "no-cache",
}));
app.get("/app.js", (c) => c.body(dashboardClient, 200, {
  "Content-Type": "text/javascript; charset=utf-8",
  "Cache-Control": "no-cache",
}));
app.get("/", (c) => c.html(dashboardPage));

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
