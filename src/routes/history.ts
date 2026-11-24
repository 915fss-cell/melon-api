import { Hono } from "hono";
import { apiError } from "../utils/api-error.js";
import { getChartHistory, HISTORY_CHARTS } from "../services/chart-history.js";
import type { ChartHistoryOptions } from "../services/chart-history.js";
import { SNAPSHOT_MATCH_WINDOW_MS } from "../services/snapshot-selection.js";

const history = new Hono();
const chartKeys = new Set(HISTORY_CHARTS.map((chart) => chart.key));
const sortOptions = new Set<ChartHistoryOptions["sort"]>([
  "date_desc",
  "date_asc",
  "rank_asc",
  "rank_desc",
]);

function parseDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  to.setUTCHours(0, 0, 0, 0);
  from.setTime(to.getTime());
  from.setUTCDate(from.getUTCDate() - 30);
  return { from, to };
}

history.get("/", async (c) => {
  const query = c.req.query();
  const fallback = defaultRange();
  let from = query.from ? parseDate(query.from) : fallback.from;
  let to = query.to ? parseDate(query.to) : fallback.to;
  const selectedAt = query.at ? new Date(query.at) : null;
  if (query.at && (!selectedAt || Number.isNaN(selectedAt.getTime()) || selectedAt.toISOString() !== query.at)) {
    return apiError(c, 400, "INVALID_SNAPSHOT_TIME", "Snapshot time must be a valid ISO date-time.");
  }
  if (selectedAt) {
    from = new Date(selectedAt.getTime() - SNAPSHOT_MATCH_WINDOW_MS);
    to = new Date(selectedAt.getTime() + SNAPSHOT_MATCH_WINDOW_MS);
  }
  if (!from || !to) {
    return apiError(c, 400, "INVALID_DATE_RANGE", "Dates must use the YYYY-MM-DD format.");
  }
  if (from > to) {
    return apiError(c, 400, "INVALID_DATE_RANGE", "The start date must be on or before the end date.");
  }

  const market = query.market ?? "KR";
  if (market !== "KR") {
    return apiError(c, 400, "INVALID_MARKET", "Only the South Korea Melon market is available in saved snapshots.");
  }

  const chart = query.chart ?? "all";
  if (chart !== "all" && !chartKeys.has(chart as never)) {
    return apiError(c, 400, "INVALID_CHART_TYPE", "Choose a chart type available in the saved snapshots.");
  }

  const sort = (query.sort ?? "date_desc") as ChartHistoryOptions["sort"];
  if (!sortOptions.has(sort)) {
    return apiError(c, 400, "INVALID_SORT", "Sort must be date_desc, date_asc, rank_asc, or rank_desc.");
  }

  const page = Number(query.page ?? "1");
  const pageSize = Number(query.pageSize ?? "25");
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    return apiError(c, 400, "INVALID_PAGE", "Page must be a positive integer.");
  }
  if (![25, 50, 100].includes(pageSize)) {
    return apiError(c, 400, "INVALID_PAGE_SIZE", "Page size must be 25, 50, or 100.");
  }

  const search = (query.q ?? "").trim();
  if (search.length > 80) {
    return apiError(c, 400, "INVALID_SEARCH", "Search must be 80 characters or fewer.");
  }
  const songId = query.track;
  if (songId !== undefined && !/^\d{1,20}$/.test(songId)) {
    return apiError(c, 400, "INVALID_TRACK_ID", "Track ID must be numeric.");
  }

  const toExclusive = new Date(to);
  if (selectedAt) toExclusive.setTime(toExclusive.getTime() + 1);
  else toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const data = await getChartHistory({
    from,
    toExclusive,
    chart: chart as ChartHistoryOptions["chart"],
    search,
    songId,
    sort,
    page,
    pageSize,
    snapshotMode: Boolean(selectedAt),
    snapshotAt: selectedAt ?? undefined,
  });
  return c.json(data, 200, { "Cache-Control": "no-store" });
});

export { history as historyRoutes };
