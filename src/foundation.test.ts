import { describe, expect, test } from "bun:test";
import app from "@/index";
import { loadConfig } from "@/config";
import { CacheService } from "@/utils/cache";
import { err, ok } from "neverthrow";
import { getMelonChart } from "@/services/chart";
import { getSongData } from "@/services/song";
import { getAlbumData } from "@/services/album";
import { findNearestChartSnapshot, findNearestSnapshot } from "@/services/snapshot-selection";

describe("saved snapshot time selection", () => {
  const selectedAt = new Date("2026-11-24T21:00:00.000Z");

  test("matches saved chart data by official chart time, not collection time", () => {
    const matchingChart = {
      capturedAt: new Date("2026-11-24T13:00:00.000Z"),
      payload: { tracks: [{ positions: { top100: { officialTime: "2026.11.25 06:00" } } }] },
    };
    const closerCaptureButDifferentChartTime = {
      capturedAt: new Date("2026-11-24T20:59:00.000Z"),
      payload: { tracks: [{ positions: { top100: { officialTime: "2026.11.25 04:00" } } }] },
    };

    expect(findNearestChartSnapshot(
      [closerCaptureButDifferentChartTime, matchingChart],
      selectedAt,
      ["top100"],
    )).toBe(matchingChart);
  });

  test("selects the nearest saved run when it is offset from the requested minute", () => {
    const earlier = { id: "earlier", capturedAt: new Date("2026-11-24T19:22:30.000Z") };
    const nearest = { id: "nearest", capturedAt: new Date("2026-11-24T21:34:27.000Z") };

    expect(findNearestSnapshot([earlier, nearest], selectedAt)).toBe(nearest);
  });

  test("returns no snapshot when the nearest run is more than one hour away", () => {
    const distant = { id: "distant", capturedAt: new Date("2026-11-24T19:59:59.000Z") };

    expect(findNearestSnapshot([distant], selectedAt)).toBeUndefined();
  });

  test("prefers the earlier run when two snapshots are equally close", () => {
    const earlier = { id: "earlier", capturedAt: new Date("2026-11-24T20:30:00.000Z") };
    const later = { id: "later", capturedAt: new Date("2026-11-24T21:30:00.000Z") };

    expect(findNearestSnapshot([later, earlier], selectedAt)).toBe(earlier);
  });
});

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
  <div class="calendar_prid">
    <span class="yyyymmdd">2026.11.23</span>
    <span class="hhmm"><span class="hour">23:00</span></span>
  </div>
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

const chartFixtures: Record<string, string> = {
  top100: chartFixture,
  hot100: chartFixture,
  day: chartFixture
    .replace("2026.11.23", "2026.11.22")
    .replace("23:00", "장르종합"),
  week: chartFixture
    .replace("2026.11.23", "2026.11.16 ~ 2026.11.22")
    .replace('    <span class="hhmm"><span class="hour">23:00</span></span>\n', ""),
  month: chartFixture
    .replace("2026.11.23", "2026.10")
    .replace('    <span class="hhmm"><span class="hour">23:00</span></span>\n', ""),
};

describe("API foundation", () => {
  test("exposes a health check", async () => {
    const response = await app.request("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("serves the chart explorer and correctly typed assets", async () => {
    const page = await app.request("/");
    const script = await app.request("/app.js");
    const styles = await app.request("/app.css");

    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    const pageText = await page.text();
    expect(pageText).toContain("Charts Explorer — Melon Charts");
    expect(pageText).toContain('id="chart-sections"');
    expect(script.headers.get("content-type")).toContain("text/javascript");
    expect(await script.text()).toContain("/api/chart/");
    expect(styles.headers.get("content-type")).toContain("text/css");
  });

  test("serves the saved chart history page and assets", async () => {
    const page = await app.request("/history");
    const script = await app.request("/history.js");
    const styles = await app.request("/history.css");

    expect(page.status).toBe(200);
    const pageText = await page.text();
    expect(pageText).toContain("Chart History — Melon Charts");
    expect(pageText).toContain('id="snapshot-at"');
    expect(pageText).toContain('id="playlist-song-select"');
    expect(pageText).toContain("CHART DATE &amp; TIME · KST");
    expect(pageText).toContain('id="snapshot-charting"');
    const scriptText = await script.text();
    expect(scriptText).toContain("/api/playlist/history");
    expect(scriptText).toContain("Asia/Seoul");
    expect(styles.headers.get("content-type")).toContain("text/css");
  });

  test("validates history filters before querying saved snapshots", async () => {
    const invalidChart = await app.request("/api/playlist/history?chart=unknown");
    const invalidDate = await app.request("/api/playlist/history?from=2026-02-30");
    const unsupportedMarket = await app.request("/api/playlist/history?market=US");
    const invalidSnapshotTime = await app.request("/api/playlist/history?at=not-a-date");

    expect(invalidChart.status).toBe(400);
    expect(invalidDate.status).toBe(400);
    expect(unsupportedMarket.status).toBe(400);
    expect(invalidSnapshotTime.status).toBe(400);
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
    globalThis.fetch = (async (input) => {
      const path = new URL(String(input)).pathname;
      const chartType = path.includes("/hot100/")
        ? "hot100"
        : path.includes("/day/")
          ? "day"
          : path.includes("/week/")
            ? "week"
            : path.includes("/month/")
              ? "month"
              : "top100";
      return new Response(chartFixtures[chartType], { status: 200 });
    }) as typeof fetch;
    CacheService.clear();

    try {
      const expectedTimes: Record<string, string> = {
        top100: "2026.11.23 23:00",
        hot100: "2026.11.23 23:00",
        day: "2026.11.22",
        week: "2026.11.16 ~ 2026.11.22",
        month: "2026.10",
      };
      for (const chartType of ["top100", "hot100", "day", "week", "month"]) {
        const response = await app.request(`/api/chart/${chartType}`);
        expect(response.status).toBe(200);
        expect(response.headers.get("X-Melon-Chart-Time")).toBe(expectedTimes[chartType]!);
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

describe("Hot 100 period handling", () => {
  test("uses separate D30 and D100 upstream requests and cache entries", async () => {
    const originalFetch = globalThis.fetch;
    const originalInterval = process.env.MELON_MIN_REQUEST_INTERVAL_MS;
    process.env.MELON_MIN_REQUEST_INTERVAL_MS = "1";
    const upstreamTypes: string[] = [];
    globalThis.fetch = (async (input) => {
      const upstreamType = new URL(String(input)).searchParams.get("chartType");
      upstreamTypes.push(upstreamType ?? "missing");
      const title = upstreamType === "D100" ? "100-day Track" : "30-day Track";
      return new Response(chartFixture.replace("Test Track", title), { status: 200 });
    }) as typeof fetch;
    CacheService.clear();

    try {
      const thirtyDay = await app.request("/api/chart/hot100?period=30");
      const thirtyDayCached = await app.request("/api/chart/hot100?period=30");
      const hundredDay = await app.request("/api/chart/hot100?period=100");

      expect(thirtyDay.status).toBe(200);
      expect(thirtyDayCached.status).toBe(200);
      expect(hundredDay.status).toBe(200);
      expect(thirtyDayCached.headers.get("X-Melon-Chart-Time")).toBe(
        thirtyDay.headers.get("X-Melon-Chart-Time")
      );
      expect(hundredDay.headers.get("X-Melon-Chart-Time")).toBe("2026.11.23 23:00");
      expect((await thirtyDay.json())[0]?.title).toBe("30-day Track");
      expect((await thirtyDayCached.json())[0]?.title).toBe("30-day Track");
      expect((await hundredDay.json())[0]?.title).toBe("100-day Track");
      expect(upstreamTypes).toEqual(["D30", "D100"]);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalInterval === undefined) delete process.env.MELON_MIN_REQUEST_INTERVAL_MS;
      else process.env.MELON_MIN_REQUEST_INTERVAL_MS = originalInterval;
      CacheService.clear();
    }
  });

  test("defaults to D30 and rejects unsupported periods before fetching", async () => {
    const originalFetch = globalThis.fetch;
    const originalInterval = process.env.MELON_MIN_REQUEST_INTERVAL_MS;
    process.env.MELON_MIN_REQUEST_INTERVAL_MS = "1";
    const upstreamTypes: string[] = [];
    globalThis.fetch = (async (input) => {
      upstreamTypes.push(new URL(String(input)).searchParams.get("chartType") ?? "missing");
      return new Response(chartFixture, { status: 200 });
    }) as typeof fetch;
    CacheService.clear();

    try {
      const defaultPeriod = await app.request("/api/chart/hot100");
      const invalidPeriod = await app.request("/api/chart/hot100?period=7");

      expect(defaultPeriod.status).toBe(200);
      expect(invalidPeriod.status).toBe(400);
      expect(await invalidPeriod.json()).toMatchObject({
        error: { code: "INVALID_CHART_PERIOD" },
      });
      expect(upstreamTypes).toEqual(["D30"]);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalInterval === undefined) delete process.env.MELON_MIN_REQUEST_INTERVAL_MS;
      else process.env.MELON_MIN_REQUEST_INTERVAL_MS = originalInterval;
      CacheService.clear();
    }
  });
});

describe("song detail parser", () => {
  test("extracts song metadata, lyrics, and grouped producer roles", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(
      await Bun.file(new URL("./fixtures/song-detail.html", import.meta.url)).text(),
      { status: 200 }
    )) as typeof fetch;
    CacheService.clear();

    try {
      const result = await getSongData("900001");
      expect(result.isOk()).toBe(true);
      const song = result._unsafeUnwrap();
      expect(song.title).toBe("테스트 곡");
      expect(song.artists).toEqual([
        { name: "테스트 아티스트", id: "12345" },
        { name: "피처링 아티스트", id: "67890" },
      ]);
      expect(song.album).toEqual({ name: "테스트 앨범", id: "24680" });
      expect(song.releaseDate).toBe("2025.03.14");
      expect(song.genre).toBe("댄스");
      expect(song.lyrics).toBe("첫 번째 줄 & 함께\n두 번째 줄");
      expect(song.producers).toEqual([
        { name: "작사가", id: "13579", roles: ["작사", "작곡"] },
        { name: "편곡가", id: "11223", roles: ["편곡"] },
      ]);
      expect(song.imageUrl).toBe("https://cdnimg.melon.co.kr/song-cover.jpg");
    } finally {
      globalThis.fetch = originalFetch;
      CacheService.clear();
    }
  });

  test("tolerates missing fields and malformed IDs without inventing metadata", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(
      await Bun.file(new URL("./fixtures/song-detail-incomplete.html", import.meta.url)).text(),
      { status: 200 }
    )) as typeof fetch;
    CacheService.clear();

    try {
      const result = await getSongData("900002");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        title: "",
        artists: [{ name: "이름만 있는 아티스트", id: "" }],
        album: { name: "이름만 있는 앨범", id: "" },
        releaseDate: "",
        genre: "",
        lyrics: "",
        producers: [],
      });
    } finally {
      globalThis.fetch = originalFetch;
      CacheService.clear();
    }
  });
});

describe("album detail parser", () => {
  test("extracts album metadata, artists, tracklist, and introduction", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(
      await Bun.file(new URL("./fixtures/album-detail.html", import.meta.url)).text(),
      { status: 200 }
    )) as typeof fetch;
    CacheService.clear();

    try {
      const result = await getAlbumData("800001");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        albumId: "800001",
        type: "정규",
        title: "테스트 앨범",
        artists: [{ name: "테스트 아티스트", id: "12345" }],
        releaseDate: "2025.03.14",
        genre: "댄스",
        publisher: "테스트 발매사",
        agency: "테스트 기획사",
        imageUrl: "https://cdnimg.melon.co.kr/album-cover.jpg",
        songs: [
          {
            songId: "10001",
            title: "타이틀 트랙",
            artists: [{ name: "테스트 아티스트", id: "12345" }],
            isTitle: true,
          },
          {
            songId: "10002",
            title: "두 번째 트랙",
            artists: [{ name: "피처링 아티스트", id: "67890" }],
            isTitle: false,
          },
        ],
        introduction: "앨범 소개 첫 줄\n앨범 소개 & 추가 내용",
      });
    } finally {
      globalThis.fetch = originalFetch;
      CacheService.clear();
    }
  });

  test("tolerates missing metadata and skips malformed track IDs", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(
      await Bun.file(new URL("./fixtures/album-detail-incomplete.html", import.meta.url)).text(),
      { status: 200 }
    )) as typeof fetch;
    CacheService.clear();

    try {
      const result = await getAlbumData("800002");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        albumId: "800002",
        type: "싱글",
        title: "",
        artists: [{ name: "이름만 있는 아티스트", id: "" }],
        releaseDate: "",
        genre: "미분류",
        publisher: "",
        agency: "",
        songs: [],
        introduction: "",
      });
    } finally {
      globalThis.fetch = originalFetch;
      CacheService.clear();
    }
  });
});
