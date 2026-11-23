import { Hono } from "hono";
import { getMelonChart } from "@/services/chart";
import { apiError } from "@/utils/api-error";

const chart = new Hono();

chart.get("/:chartType", async (c) => {
  const chartType = c.req.param("chartType");

  const allowedCharts = new Set(["top100", "hot100", "day", "week", "month"]);
  if (!allowedCharts.has(chartType)) {
    return apiError(c, 400, "INVALID_CHART_TYPE", "Chart type must be one of: top100, hot100, day, week, month.");
  }

  const result = await getMelonChart(chartType);
  return result.match(
    (data) => c.json(data),
    () => apiError(c, 502, "UPSTREAM_ERROR", "Chart data is temporarily unavailable.")
  );
});

export { chart as chartRoutes };
