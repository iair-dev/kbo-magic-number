import { involves, opponentOf, winningPercentage } from "@/lib/race/core";
import type { Game, TeamStanding, UnscheduledGame } from "@/lib/types";

export type Record3 = { wins: number; losses: number; draws: number };
export type Result = "W" | "L" | "D";

export type TeamStats = {
  team: string;
  home: Record3;
  away: Record3;
  /** 최근 경기부터 과거 순. 최근 10경기. */
  recent: Result[];
  last10: Record3;
  streak: { kind: Result; length: number } | null;
  /** 잔여 일정 난이도. 잔여 상대들의 평균 승률. 높을수록 어렵다. */
  strengthOfSchedule: number;
  remainingHome: number;
  remainingAway: number;
};

const empty = (): Record3 => ({ wins: 0, losses: 0, draws: 0 });

function resultFor(game: Game, team: string): Result | null {
  if (game.status !== "completed" || game.awayScore === null || game.homeScore === null) return null;
  if (game.awayScore === game.homeScore) return "D";
  const awayWon = game.awayScore > game.homeScore;
  const isAway = game.awayTeam === team;
  return awayWon === isAway ? "W" : "L";
}

function add(record: Record3, result: Result) {
  if (result === "W") record.wins += 1;
  else if (result === "L") record.losses += 1;
  else record.draws += 1;
}

export function computeTeamStats(
  standings: TeamStanding[],
  completed: Game[],
  scheduled: Game[],
  unscheduled: UnscheduledGame[],
): TeamStats[] {
  const rateByTeam = new Map(standings.map((row) => [row.team, row.winRate]));
  const chronological = [...completed].sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  );

  return standings.map((standing) => {
    const team = standing.team;
    const home = empty();
    const away = empty();
    const timeline: Result[] = [];

    for (const game of chronological) {
      if (!involves(game, team)) continue;
      const result = resultFor(game, team);
      if (!result) continue;
      add(game.homeTeam === team ? home : away, result);
      timeline.push(result);
    }

    const recent = timeline.slice(-10).reverse();
    const last10 = empty();
    for (const result of recent) add(last10, result);

    let streak: TeamStats["streak"] = null;
    for (const result of recent) {
      if (!streak) streak = { kind: result, length: 1 };
      else if (streak.kind === result) streak.length += 1;
      else break;
    }

    const remaining = [...scheduled, ...unscheduled].filter((game) => involves(game, team));
    const opponentRates = remaining.map((game) => rateByTeam.get(opponentOf(game, team)) ?? 0.5);
    const strengthOfSchedule = opponentRates.length
      ? opponentRates.reduce((sum, rate) => sum + rate, 0) / opponentRates.length
      : 0.5;

    return {
      team,
      home,
      away,
      recent,
      last10,
      streak,
      strengthOfSchedule,
      remainingHome: remaining.filter((game) => game.homeTeam === team).length,
      remainingAway: remaining.filter((game) => game.awayTeam === team).length,
    };
  });
}

export function recordRate(record: Record3) {
  return winningPercentage(record.wins, record.losses);
}

/** 리그 전체 홈 승률과 무승부 비율. 시뮬레이션 모수로 쓴다. */
export function leagueTendencies(completed: Game[]) {
  let homeWins = 0;
  let decisions = 0;
  let draws = 0;

  for (const game of completed) {
    if (game.status !== "completed" || game.awayScore === null || game.homeScore === null) continue;
    if (game.homeScore === game.awayScore) {
      draws += 1;
      continue;
    }
    decisions += 1;
    if (game.homeScore > game.awayScore) homeWins += 1;
  }

  const total = decisions + draws;
  return {
    homeWinRate: decisions === 0 ? 0.5 : homeWins / decisions,
    drawRate: total === 0 ? 0 : draws / total,
    sampleSize: total,
  };
}
