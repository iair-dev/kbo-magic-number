import { buildProbabilityHistory, type ProbabilityHistory } from "@/lib/race/history";
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
  /** 주차별 우승·가을야구 확률 추이. 완료 경기에서 각 시점 순위를 역산해 계산한다. */
  history: ProbabilityHistory;
  counts: { completed: number; scheduled: number; unscheduled: number };
};

export function buildModel(data: DashboardData): DashboardModel {
  const { standings, completedGames, remainingGames, unscheduledGames } = data;
  const teams = standings.map((row) => row.team);

  const h2h = buildHeadToHead(completedGames);
  const headToHead: HeadToHeadPayload = {};
  for (const [key, record] of h2h) {
    headToHead[key] = [record.wins, record.losses, record.draws];
  }

  const simulation = simulateSeason(standings, remainingGames, unscheduledGames, completedGames);

  // 마지막 주차는 히스토리용 5천회 대신 현재 시점 2만회 결과로 덮는다.
  // 그래야 그래프 끝점과 화면 상단의 확률이 어긋나지 않는다.
  const lastPlayed = completedGames.reduce((max, game) => (game.date > max ? game.date : max), "");
  const history = buildProbabilityHistory(
    teams,
    completedGames,
    remainingGames,
    unscheduledGames,
    lastPlayed,
  );
  const lastPoint = history.points.at(-1);
  if (lastPoint) {
    for (const projection of simulation.projections) {
      const current = lastPoint.byTeam[projection.team];
      if (!current) continue;
      current.title = projection.titleProbability;
      current.playoff = projection.playoffProbability;
    }
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
    simulation,
    history,
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
