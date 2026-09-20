import {
  date,
  integer,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const kbo = pgSchema("kbo_magic");

export const teams = kbo.table("teams", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  color: text("color"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const games = kbo.table("games", {
  id: text("id").primaryKey(),
  season: integer("season").notNull(),
  gameDate: date("game_date").notNull(),
  gameTime: text("game_time").notNull(),
  awayTeam: text("away_team").notNull(),
  homeTeam: text("home_team").notNull(),
  awayScore: integer("away_score"),
  homeScore: integer("home_score"),
  stadium: text("stadium").notNull(),
  status: text("status").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const standingsSnapshots = kbo.table(
  "standings_snapshots",
  {
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    season: integer("season").notNull(),
    team: text("team").notNull(),
    rank: integer("rank").notNull(),
    games: integer("games").notNull(),
    wins: integer("wins").notNull(),
    losses: integer("losses").notNull(),
    draws: integer("draws").notNull(),
    winRate: numeric("win_rate", { precision: 5, scale: 4 }).notNull(),
    gamesBehind: numeric("games_behind", { precision: 4, scale: 1 }),
    streak: text("streak").notNull(),
  },
  (table) => [primaryKey({ columns: [table.recordedAt, table.team] })],
);

export const syncRuns = kbo.table("sync_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull(),
  message: text("message"),
});
