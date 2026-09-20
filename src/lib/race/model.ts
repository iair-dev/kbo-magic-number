import { computeTeamNumbers, type TeamNumbers } from "@/lib/race/magic-number";
import { simulateSeason, type SimulationResult } from "@/lib/race/monte-carlo";
import { computeTeamStats, type TeamStats } from "@/lib/race/stats";
import { buildHeadToHead, type HeadToHead } from "@/lib/race/tiebreak";
import type { DashboardData, Game, TeamStanding, UnscheduledGame } from "@/lib/types";

/** `"A:B"` → A가 B에게 거둔 [승, 패, 무]. Map보다 가볍게 클라이언트로 넘긴다. */
export type HeadToHeadPayload = Record<string, [number, number, number]>;

/**
 * 화면이 실제로 쓰는 데이터. 완료 경기 653건을 그대로 내려보내면 페이로드가
 * 커지므로 서버에서 집계까지 끝내고 결과만 전달한다.
 */
export type DashboardModel = {
  season: number;
  updatedAt: string;
  source: DashboardData["source"];
  standings: TeamStanding[];
  remainingGames: Game[];
  unscheduledGames: UnscheduledGame[];
  headToHead: HeadToHeadPayload;
  stats: TeamStats[];
  numbers: TeamNumbers[];
  simulation: SimulationResult;
  counts: { completed: number; scheduled: number; unscheduled: number };
};

export function buildModel(data: DashboardData): DashboardModel {
  const { standings, completedGames, remainingGames, unscheduledGames } = data;

  const h2h = buildHeadToHead(completedGames);
  const headToHead: HeadToHeadPayload = {};
  for (const [key, record] of h2h) {
    headToHead[key] = [record.wins, record.losses, record.draws];
  }

  return {
    season: data.season,
    updatedAt: data.updatedAt,
    source: data.source,
    standings,
    remainingGames,
    unscheduledGames,
    headToHead,
    stats: computeTeamStats(standings, completedGames, remainingGames, unscheduledGames),
    numbers: computeTeamNumbers(standings),
    simulation: simulateSeason(standings, remainingGames, unscheduledGames, completedGames),
    counts: {
      completed: completedGames.length,
      scheduled: remainingGames.length,
      unscheduled: unscheduledGames.length,
    },
  };
}

export function headToHeadMap(payload: HeadToHeadPayload): HeadToHead {
  return new Map(
    Object.entries(payload).map(([key, [wins, losses, draws]]) => [key, { wins, losses, draws }]),
  );
}
