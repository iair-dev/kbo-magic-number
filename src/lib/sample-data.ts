import type { DashboardData } from "@/lib/types";

const rows = [
  ["KT", 129, 78, 47, 4],
  ["삼성", 131, 76, 52, 3],
  ["LG", 131, 75, 55, 1],
  ["KIA", 130, 71, 57, 2],
  ["두산", 132, 65, 62, 5],
  ["NC", 128, 59, 67, 2],
  ["SSG", 132, 58, 69, 5],
  ["롯데", 129, 56, 71, 2],
  ["한화", 130, 54, 72, 4],
  ["키움", 134, 45, 85, 4],
] as const;

export const sampleData: DashboardData = {
  season: 2026,
  standings: rows.map(([team, games, wins, losses, draws], index) => ({
    rank: index + 1,
    team,
    games,
    wins,
    losses,
    draws,
    winRate: wins / (wins + losses),
    gamesBehind: index === 0 ? null : 0,
    streak: "-",
  })),
  completedGames: [],
  remainingGames: [],
  unscheduledGames: [],
  updatedAt: new Date().toISOString(),
  source: "sample",
};
