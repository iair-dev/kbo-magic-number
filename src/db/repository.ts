import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { games, standingsSnapshots, syncRuns, teams } from "@/db/schema";
import { reconstructUnscheduled } from "@/lib/kbo/client";
import { TEAM_META, type DashboardData } from "@/lib/types";

export async function saveDashboard(data: DashboardData) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const recordedAt = new Date(data.updatedAt);

  await db.transaction(async (tx) => {
    for (const row of data.standings) {
      await tx
        .insert(teams)
        .values({
          code: row.team,
          name: row.team,
          color: TEAM_META[row.team]?.color,
          updatedAt: recordedAt,
        })
        .onConflictDoUpdate({
          target: teams.code,
          set: { name: row.team, color: TEAM_META[row.team]?.color, updatedAt: recordedAt },
        });
    }

    const allGames = [...data.completedGames, ...data.remainingGames];
    if (allGames.length) {
      await tx
        .insert(games)
        .values(
          allGames.map((game) => ({
            id: game.id,
            season: data.season,
            gameDate: game.date,
            gameTime: game.time,
            awayTeam: game.awayTeam,
            homeTeam: game.homeTeam,
            awayScore: game.awayScore,
            homeScore: game.homeScore,
            stadium: game.stadium,
            status: game.status,
            updatedAt: recordedAt,
          })),
        )
        .onConflictDoUpdate({
          target: games.id,
          set: {
            awayScore: sql`excluded.away_score`,
            homeScore: sql`excluded.home_score`,
            status: sql`excluded.status`,
            gameDate: sql`excluded.game_date`,
            gameTime: sql`excluded.game_time`,
            updatedAt: recordedAt,
          },
        });
    }

    await tx.insert(standingsSnapshots).values(
      data.standings.map((row) => ({
        recordedAt,
        season: data.season,
        team: row.team,
        rank: row.rank,
        games: row.games,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
        winRate: row.winRate.toFixed(4),
        gamesBehind: row.gamesBehind?.toFixed(1) ?? null,
        streak: row.streak,
      })),
    );
  });
}

export async function getLatestDashboardFromDb(): Promise<DashboardData | null> {
  const db = getDb();
  if (!db) return null;
  const [latest] = await db
    .select({ recordedAt: standingsSnapshots.recordedAt, season: standingsSnapshots.season })
    .from(standingsSnapshots)
    .orderBy(desc(standingsSnapshots.recordedAt))
    .limit(1);
  if (!latest) return null;

  const [standingRows, gameRows] = await Promise.all([
    db
      .select()
      .from(standingsSnapshots)
      .where(eq(standingsSnapshots.recordedAt, latest.recordedAt))
      .orderBy(standingsSnapshots.rank),
    db
      .select()
      .from(games)
      .where(eq(games.season, latest.season))
      .orderBy(games.gameDate, games.gameTime),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const allStored = gameRows.map((game) => ({
    id: game.id,
    date: game.gameDate,
    time: game.gameTime,
    awayTeam: game.awayTeam,
    homeTeam: game.homeTeam,
    awayScore: game.awayScore,
    homeScore: game.homeScore,
    stadium: game.stadium,
    status: game.status as "scheduled" | "completed" | "cancelled",
  }));

  return {
    season: latest.season,
    updatedAt: latest.recordedAt.toISOString(),
    source: "database",
    standings: standingRows.map((row) => ({
      rank: row.rank,
      team: row.team,
      games: row.games,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      winRate: Number(row.winRate),
      gamesBehind: row.gamesBehind === null ? null : Number(row.gamesBehind),
      streak: row.streak,
    })),
    completedGames: allStored.filter((game) => game.status === "completed"),
    remainingGames: allStored.filter(
      (game) => game.status === "scheduled" && game.date >= today,
    ),
    unscheduledGames: reconstructUnscheduled(allStored),
  };
}

export async function recordSync(status: string, message?: string) {
  const db = getDb();
  if (!db) return;
  await db.insert(syncRuns).values({ status, message, finishedAt: new Date() });
}
