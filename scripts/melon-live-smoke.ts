import { getMelonChart } from "../src/services/chart";
import { getSongData } from "../src/services/song";
import { getAlbumData } from "../src/services/album";
import { MelonTrack } from "../src/types/charts";

const chartTypes = ["top100", "hot100", "day", "week", "month"] as const;
const chartResults = new Map<string, MelonTrack[]>();
let failures = 0;

function reportFailure(kind: "upstream failure" | "parser/data-shape failure", label: string, message: string): void {
  failures += 1;
  console.error(`[${kind}] ${label}: ${message}`);
}

async function checkChart(chartType: (typeof chartTypes)[number], period?: "30" | "100"): Promise<void> {
  const label = chartType === "hot100" ? `Hot 100 (${period ?? "30"} days)` : chartType;
  const result = await getMelonChart(chartType, period);
  if (result.isErr()) {
    reportFailure("upstream failure", label, result.error.message);
    return;
  }

  const tracks = result.value;
  if (!tracks.length || !tracks.some((track) => track.rank && track.title && track.title !== "Unknown Title")) {
    reportFailure("parser/data-shape failure", label, `Received ${tracks.length} tracks without a usable rank/title.`);
    return;
  }

  chartResults.set(label, tracks);
  console.log(`[ok] ${label}: parsed ${tracks.length} tracks`);
}

async function run(): Promise<void> {
  console.log("Running a bounded live Melon smoke check (six chart requests, then up to two detail requests).");
  console.log(`Outbound requests are spaced by MELON_MIN_REQUEST_INTERVAL_MS (default ${process.env.MELON_MIN_REQUEST_INTERVAL_MS ?? "1000"} ms).`);

  for (const chartType of chartTypes) {
    await checkChart(chartType, chartType === "hot100" ? "30" : undefined);
    if (chartType === "hot100") await checkChart("hot100", "100");
  }

  const topTracks = chartResults.get("top100") ?? [];
  const songId = process.env.MELON_SMOKE_SONG_ID ?? topTracks.find((track) => track.songId)?.songId ?? "";
  const albumId = process.env.MELON_SMOKE_ALBUM_ID ?? topTracks.find((track) => track.albumId)?.albumId ?? "";
  console.log(`[info] Top 100 IDs parsed: ${topTracks.filter((track) => track.songId).length} song IDs, ${topTracks.filter((track) => track.albumId).length} album IDs`);

  if (!/^\d+$/.test(songId)) {
    reportFailure("parser/data-shape failure", "song details", "No numeric song ID was available; set MELON_SMOKE_SONG_ID to a known valid Melon song ID to run this check.");
  } else {
    const songResult = await getSongData(songId);
    if (songResult.isErr()) {
      reportFailure("upstream failure", "song details", songResult.error.message);
    } else if (!songResult.value.title || !songResult.value.artists.length) {
      reportFailure("parser/data-shape failure", "song details", "The detail page returned no title or artist.");
    } else {
      console.log(`[ok] song details: ${songResult.value.title} (${songId})`);
    }
  }

  if (!/^\d+$/.test(albumId)) {
    reportFailure("parser/data-shape failure", "album details", "No numeric album ID was available; set MELON_SMOKE_ALBUM_ID to a known valid Melon album ID to run this check.");
  } else {
    const albumResult = await getAlbumData(albumId);
    if (albumResult.isErr()) {
      reportFailure("upstream failure", "album details", albumResult.error.message);
    } else if (!albumResult.value.title) {
      reportFailure("parser/data-shape failure", "album details", `Album ${albumId} returned no title.`);
    } else {
      console.log(`[ok] album details: ${albumResult.value.title} (${albumId})`);
    }
  }

  if (failures > 0) {
    console.error(`Smoke check finished with ${failures} failure(s). No retries were performed.`);
    process.exitCode = 1;
  } else {
    console.log("Smoke check passed. No retries were performed.");
  }
}

await run();
