import { Result, err, ok } from "neverthrow";
import { getMelonChartData } from "./chart.js";
import { MelonScraper } from "./scraper.js";
import { CacheService } from "../utils/cache.js";
import { MelonTrack } from "../types/charts.js";

export type LiveChartKey = "top100" | "hot100_30" | "hot100_100" | "day" | "week" | "month";

export interface PlaylistTrack {
  songId: string;
  title: string;
  artists: string[];
  album: string;
  albumId: string | null;
  imageUrl: string;
}

export interface LiveChartPosition {
  rank: string;
  rankChange: MelonTrack["rankChange"];
  officialTime: string | null;
}

export interface LiveFilterTrack extends PlaylistTrack {
  positions: Record<LiveChartKey, LiveChartPosition | null>;
}

export interface LiveFilterData {
  playlistId: string;
  updatedAt: string;
  tracks: LiveFilterTrack[];
  unavailableCharts: string[];
}

const playlistId = "529294115";

const chartSources: Array<{
  key: LiveChartKey;
  label: string;
  type: string;
  period?: string;
}> = [
  { key: "top100", label: "Top 100", type: "top100" },
  { key: "hot100_30", label: "Hot 100 · 30d", type: "hot100", period: "30" },
  { key: "hot100_100", label: "Hot 100 · 100d", type: "hot100", period: "100" },
  { key: "day", label: "Daily", type: "day" },
  { key: "week", label: "Weekly", type: "week" },
  { key: "month", label: "Monthly", type: "month" },
];

async function fetchPlaylistTracks(): Promise<Result<PlaylistTrack[], Error>> {
  return CacheService.getOrFetchResult<PlaylistTrack[]>(`melon_playlist_${playlistId}`, async () => {
    const scraper = new MelonScraper();
    const htmlResult = await scraper.fetchHtml(
      `/mymusic/playlist/mymusicplaylistview_listSong.htm?plylstSeq=${playlistId}`
    );

    return htmlResult.andThen(($) => {
      const tracks: PlaylistTrack[] = [];
      const seen = new Set<string>();

      $("tbody tr").each((_index, row) => {
        const checkboxId = $(row).find("input.input_check").attr("value");
        const playHandler = $(row).find('[onclick*="playSong"]').attr("onclick") || "";
        const handlerId = playHandler.match(/playSong\([^,]+,\s*[\x27\"]?(\d+)/)?.[1];
        const songId = (checkboxId || handlerId || "").replace(/\D/g, "");
        if (!/^\d{5,}$/.test(songId) || seen.has(songId)) return;

        const title = $(row)
          .find('td')
          .eq(2)
          .find('a[href*="goSongDetail"]')
          .first()
          .text()
          .replace(/\s+/g, " ")
          .trim();
        if (!title) return;

        const artists: string[] = [];
        $(row)
          .find("td")
          .eq(3)
          .find("a")
          .each((_artistIndex, artist) => {
            const name = $(artist).text().replace(/\s+/g, " ").trim();
            if (name && !artists.includes(name)) artists.push(name);
          });

        const albumLink = $(row).find("td").eq(4).find("a").first();
        const album = albumLink.text().replace(/\s+/g, " ").trim();
        const albumId = albumLink.attr("href")?.match(/goAlbumDetail\(['\"]?(\d+)/)?.[1] || null;
        const image = $(row).find("img").first();
        const imageUrl =
          image.attr("src") || image.attr("data-original") || image.attr("data-src") || "";

        seen.add(songId);
        tracks.push({ songId, title, artists, album, albumId, imageUrl });
      });

      if (!tracks.length) {
        return err(new Error("The public Melon playlist did not return any readable tracks."));
      }
      return ok(tracks);
    });
  });
}

export async function getLiveFilterData(): Promise<Result<LiveFilterData, Error>> {
  const playlistResult = await fetchPlaylistTracks();
  if (playlistResult.isErr()) return err(playlistResult.error);

  const tracks: LiveFilterTrack[] = playlistResult.value.map((track) => ({
    ...track,
    positions: {
      top100: null,
      hot100_30: null,
      hot100_100: null,
      day: null,
      week: null,
      month: null,
    },
  }));
  const tracksById = new Map(tracks.map((track) => [track.songId, track]));
  const unavailableCharts: string[] = [];

  const chartResults = await Promise.all(
    chartSources.map(async (source) => ({
      source,
      result: await getMelonChartData(source.type, source.period ?? "30"),
    }))
  );

  for (const { source, result } of chartResults) {
    if (result.isErr()) {
      unavailableCharts.push(source.label);
      continue;
    }

    for (const chartTrack of result.value.tracks) {
      if (!chartTrack.songId) continue;
      const playlistTrack = tracksById.get(chartTrack.songId);
      if (!playlistTrack) continue;
      playlistTrack.positions[source.key] = {
        rank: chartTrack.rank,
        rankChange: chartTrack.rankChange,
        officialTime: result.value.officialTime,
      };
      if (!playlistTrack.imageUrl && chartTrack.imageUrl) {
        playlistTrack.imageUrl = chartTrack.imageUrl;
      }
    }
  }

  return ok({
    playlistId,
    updatedAt: new Date().toISOString(),
    tracks,
    unavailableCharts,
  });
}
