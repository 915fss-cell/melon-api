import { describe, expect, test } from "bun:test";
import app from "@/index";
import { loadConfig } from "@/config";
import { CacheService } from "@/utils/cache";
import { err, ok } from "neverthrow";

describe("application configuration", () => {
  test("uses documented defaults", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv)).toEqual({
      port: 3000,
      enableChartPrefetch: false,
      prefetchIntervalMs: 60000,
      melonMinRequestIntervalMs: 1000,
    });
  });

  test("rejects invalid values", () => {
    expect(() => loadConfig({ PORT: "0" } as NodeJS.ProcessEnv)).toThrow("PORT must be a positive integer");
    expect(() => loadConfig({ ENABLE_CHART_PREFETCH: "yes" } as NodeJS.ProcessEnv)).toThrow("ENABLE_CHART_PREFETCH must be either");
  });
});

describe("cache", () => {
  test("deduplicates concurrent fetches and caches the value", async () => {
    CacheService.clear();
    let calls = 0;
    let release!: (value: string) => void;
    const fetchValue = () => {
      calls += 1;
      return new Promise<string>((resolve) => { release = resolve; });
    };

    const first = CacheService.getOrFetch("dedupe-test", fetchValue);
    const second = CacheService.getOrFetch("dedupe-test", fetchValue);
    await Promise.resolve();
    expect(calls).toBe(1);
    release("fresh");
    expect(await Promise.all([first, second])).toEqual(["fresh", "fresh"]);
    expect(await CacheService.getOrFetch("dedupe-test", fetchValue)).toBe("fresh");
    expect(calls).toBe(1);
  });

  test("does not cache failed results", async () => {
    CacheService.clear();
    let calls = 0;
    const fetchResult = async () => {
      calls += 1;
      return calls === 1 ? err(new Error("temporary")) : ok("recovered");
    };

    expect((await CacheService.getOrFetchResult("result-test", fetchResult)).isErr()).toBe(true);
    expect((await CacheService.getOrFetchResult("result-test", fetchResult))._unsafeUnwrap()).toBe("recovered");
    expect(calls).toBe(2);
  });
});

const chartFixture = `
  <table><tbody><tr><td>
    <span class="rank">1</span>
    <a href="javascript:melon.play.playSong('100', 12345);">play</a>
    <div class="ellipsis rank01"><span><a>Test Track</a></span></div>
    <div class="ellipsis rank02"><a>Test Artist</a></div>
    <div class="ellipsis rank03"><a href="javascript:melon.link.goAlbumDetail('67890');">Test Album</a></div>
    <img src="https://image.example/album-cover.jpg" />
    <span class="bullet_icons rank_static"></span>
  </td></tr></tbody></table>
`;

describe("API foundation", () => {
  test("exposes a health check", async () => {
    const response = await app.request("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("uses a consistent not-found error response", async () => {
    const response = await app.request("/api/unknown-endpoint");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "The requested endpoint was not found." },
    });
  });

  test("rejects unsupported chart types before scraping", async () => {
    const response = await app.request("/api/chart/not-a-chart");
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_CHART_TYPE" } });
  });

  test("scrapes and serves all documented chart routes", async () => {
    const originalFetch = globalThis.fetch;
    const originalInterval = process.env.MELON_MIN_REQUEST_INTERVAL_MS;
    process.env.MELON_MIN_REQUEST_INTERVAL_MS = "1";
    globalThis.fetch = (async () => new Response(chartFixture, { status: 200 })) as typeof fetch;
    CacheService.clear();

    try {
      for (const chartType of ["top100", "hot100", "day", "week", "month"]) {
        const response = await app.request(`/api/chart/${chartType}`);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([
          {
            rank: "1",
            songId: "12345",
            title: "Test Track",
            artists: ["Test Artist"],
            album: "Test Album",
            albumId: "67890",
            imageUrl: "https://image.example/album-cover.jpg",
            rankChange: { direction: "static", value: 0 },
          },
        ]);
      }
    } finally {
      globalThis.fetch = originalFetch;
      if (originalInterval === undefined) delete process.env.MELON_MIN_REQUEST_INTERVAL_MS;
      else process.env.MELON_MIN_REQUEST_INTERVAL_MS = originalInterval;
      CacheService.clear();
    }
  });

  test("rejects invalid song and album IDs without scraping", async () => {
    const songResponse = await app.request("/api/song/not-an-id");
    const albumResponse = await app.request("/api/album/not-an-id");
    expect(songResponse.status).toBe(400);
    expect(albumResponse.status).toBe(400);
  });
});
