# Melon Music API

An API for retrieving music data from Melon, a South Korean music streaming service, with web scraping.

## Setup and Installation

To install dependencies:

```sh
bun install
```

To run:

```sh
bun run dev
```

Open http://localhost:3000. Runtime settings are optional and validated at startup:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP server port |
| `ENABLE_CHART_PREFETCH` | `false` | Enable background chart prefetching |
| `PREFETCH_INTERVAL_MS` | `60000` | Interval between prefetch cycles |
| `MELON_MIN_REQUEST_INTERVAL_MS` | `1000` | Minimum spacing between outbound Melon requests |

See `.env.example` for a local configuration template. No API credentials are required.

## Deployment

`wrangler.toml` currently configures a Cloudflare Workers entry point at `build/index.js` and invokes `bun run build`. The deployment target and generated bundle have not been verified in this audit; confirm Bun/Hono/Cheerio compatibility and the build output before deploying. No deployment was performed.

## API Documentation

### Base Endpoint

- `GET /` - Returns basic API information and available endpoints
- `GET /health` - Returns `{ "status": "ok" }` when the API process is ready

Invalid requests return a consistent JSON error, for example `{ "error": { "code": "NOT_FOUND", "message": "The requested endpoint was not found." } }`. Invalid IDs and chart types use HTTP 400, missing records use 404, and temporary Melon/upstream failures use 502.

### Chart Endpoints

- `GET /api/chart/top100` - Returns the Top 100 chart
- `GET /api/chart/hot100` - Returns the Hot 100 chart
- `GET /api/chart/day` - Returns the Daily chart
- `GET /api/chart/week` - Returns the Weekly chart
- `GET /api/chart/month` - Returns the Monthly chart

### Song Endpoint

- `GET /api/song/:songId` - Returns detailed information about a specific song

### Album Endpoint

- `GET /api/album/:albumId` - Returns detailed information about a specific album

### Response Format

Each chart endpoint returns an array of track objects with the following structure:

```json
{
  "rank": "1",
  "songId": "12345678",
  "title": "Song Title",
  "artists": ["Artist Name"],
  "album": "Album Name",
  "albumId": "87654321",
  "imageUrl": "https://example.com/image.jpg",
  "rankChange": {
    "direction": "up",
    "value": 2
  }
}
```

The song endpoint returns detailed information about a specific song:

```json
{
  "title": "Song Title",
  "artists": [
    {
      "name": "Artist Name",
      "id": "12345"
    }
  ],
  "album": {
    "name": "Album Name",
    "id": "67890"
  },
  "releaseDate": "2023.01.01",
  "genre": "댄스",
  "imageUrl": "https://example.com/album-cover.jpg",
  "lyrics": "Song lyrics here...",
  "producers": [
    {
      "name": "Producer Name",
      "id": "54321",
      "roles": ["작사", "작곡"]
    }
  ]
}
```

The album endpoint returns detailed information about a specific album:

```json
{
  "albumId": "67890",
  "type": "정규",
  "title": "Album Title",
  "artists": [
    {
      "name": "Artist Name",
      "id": "12345"
    }
  ],
  "releaseDate": "2023.01.01",
  "genre": "K-POP",
  "publisher": "Example Entertainment",
  "agency": "Example Agency",
  "imageUrl": "https://example.com/album-cover.jpg",
  "songs": [
    {
      "songId": "56789",
      "title": "First Track",
      "artists": [
        {
          "name": "Artist Name",
          "id": "12345"
        }
      ],
      "isTitle": true
    },
    {
      "songId": "56790",
      "title": "Second Track (feat. Another Artist)",
      "artists": [
        {
          "name": "Artist Name",
          "id": "12345"
        },
        {
          "name": "Another Artist",
          "id": "67890"
        }
      ],
      "isTitle": false
    }
  ],
  "introduction": "This is an example album introduction text.\nIt can contain multiple lines describing the album."
}
```

## Features

### Caching

Chart data is cached for 1 minute to improve performance and reduce load on the Melon website. Concurrent cold requests for the same resource share a single fetch, and outbound Melon requests are spaced by at least 1 second by default (`MELON_MIN_REQUEST_INTERVAL_MS`). The cache is process-local and bounded to 500 entries.

### Chart Prefetching

The API includes a prefetching system that automatically refreshes chart data in the background:

- Prevents "cold fetches" by keeping the cache warm
- Especially useful in standalone server mode
- Configurable through environment variables:
  - `ENABLE_CHART_PREFETCH`: Set to "true" to enable prefetching (default: false)
  - `PREFETCH_INTERVAL_MS`: Time between prefetch operations in milliseconds (default: 60000 = 1 minute)

To enable prefetching, create a `.env` file based on the `.env.example` template and set the appropriate values:

```env
ENABLE_CHART_PREFETCH=true
PREFETCH_INTERVAL_MS=60000
```

When prefetching is enabled, the server will:

- Automatically fetch all chart types on startup
- Periodically refresh chart data at the configured interval
- Log success/failure messages for each prefetch operation
- Properly shutdown the prefetcher when the server terminates

### Request Logging

The server logs only the HTTP method, URL path (without query parameters), response status, and elapsed time. It does not log client IP addresses, user-agent headers, referrers, or full URLs.

### Direct Data Access

You can use the chart and song scraping functionality directly without running the API server. This is useful for integrating the data into your own applications:

```ts
// For chart data
import { getMelonChart } from "./src/services/chart";

// Usage in an async function
async function fetchTopChart() {
  const chartData = await getMelonChart("top100");
  console.log(chartData);
}
```

Available chart types: `top100`, `hot100`, `day`, `week`, `month`

```ts
// For song data
import { getSongData } from "./src/services/song";

// Usage in an async function
async function fetchSongDetails() {
  const songData = await getSongData("12345678");
  console.log(songData);
}
```

```ts
// For album data
import { getAlbumData } from "./src/services/album";

// Usage in an async function
async function fetchAlbumDetails() {
  const albumData = await getAlbumData("12345678");
  console.log(albumData);
}
```

### Development Checks

Run the test suite with `bun test` and check types with `bun x tsc --noEmit`.

## Technical Details

- Built with Hono.js - a lightweight web framework
- Uses Cheerio for HTML parsing and web scraping
- Written in TypeScript
- Runs on Bun runtime for optimal performance

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Note:** While this code is MIT licensed, usage of this API to access Melon's data is subject to the legal disclaimer below.

## Legal Disclaimer

This project is not affiliated with, endorsed by, or in any way officially connected to Melon Music or Kakao M Corp.

**Important Notice:**

- This API relies on web scraping techniques as Melon does not provide a public API
- The functionality may break if Melon changes their website structure
- This project may be discontinued at any time if requested by Melon
- Users of this API should review Melon's Terms of Service before use
- Use responsibly and avoid excessive requests that could impact Melon's services

By using this API, you acknowledge and accept these limitations and risks.
