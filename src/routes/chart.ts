import { Hono } from "hono";
import { getMelonChart, getMelonChartCacheKey } from "../services/chart.js";
import { apiError } from "../utils/api-error.js";
import { CacheService } from "../utils/cache.js";

const chart = new Hono();

chart.get("/:chartType", async (c) => {
  const chartType = c.req.param("chartType");

  const allowedCharts = new Set(["top100", "hot100", "day", "week", "month"]);
  if (!allowedCharts.has(chartType)) {
    return apiError(c, 400, "INVALID_CHART_TYPE", "Chart type must be one of: top100, hot100, day, week, month.");
  }

  const period = c.req.query("period");
  if (chartType !== "hot100" && period !== undefined) {
    return apiError(c, 400, "INVALID_CHART_PERIOD", "The period parameter is only supported for hot100.");
  }
  if (chartType === "hot100" && period !== undefined && period !== "30" && period !== "100") {
    return apiError(c, 400, "INVALID_CHART_PERIOD", "Hot 100 period must be 30 or 100 days.");
  }

  const resolvedPeriod = chartType === "hot100" ? period ?? "30" : "30";
  const result = await getMelonChart(chartType, resolvedPeriod);
  return result.match(
    (data) => {
      const updatedAt = CacheService.getUpdatedAt(getMelonChartCacheKey(chartType, resolvedPeriod));
      const headers: Record<string, string> = {};
      if (updatedAt !== null) {
        headers["X-Chart-Updated-At"] = new Date(updatedAt).toISOString();
      }
      return c.json(data, 200, headers);
    },
    () => apiError(c, 502, "UPSTREAM_ERROR", "Chart data is temporarily unavailable.")
  );
});

export { chart as chartRoutes };
