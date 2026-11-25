import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { LiveFilterData } from "../services/playlist.js";

export const liveFilterSnapshots = pgTable(
  "live_filter_snapshots",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    playlistId: text("playlist_id").notNull(),
    officialTimeSignature: text("snapshot_hash").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    payload: jsonb("payload").$type<LiveFilterData>().notNull(),
  },
  (table) => [
    uniqueIndex("live_filter_snapshots_playlist_hash_unique").on(
      table.playlistId,
      table.officialTimeSignature,
    ),
    index("live_filter_snapshots_playlist_captured_at_idx").on(
      table.playlistId,
      table.capturedAt,
    ),
  ],
);
