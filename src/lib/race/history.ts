import { winningPercentage } from "@/lib/race/core";
import { simulateSeason } from "@/lib/race/monte-carlo";
import { buildHeadToHead, compareForRank } from "@/lib/race/tiebreak";
import { PLAYOFF_SPOTS, type Game, type TeamStanding, type UnscheduledGame } from "@/lib/types";

/**
 * 주차별 확률은 매 시점마다 시뮬레이션을 다시 돌려야 해서 현재 시점(2만회)보다
 * 가볍게 잡는다. 시즌 초에는 잔여 경기가 700개에 가까워 비용이 10배 넘게 든다.
 */
export const HISTORY_SIMULATIONS = 5_000;

export type HistoryPoint = {
  /** 주차 종료일 (이 날짜까지의 결과만 반영). */
  date: string;
  label: string;
  gamesPlayed: number;
  byTeam: Record<string, { title: number; playoff: number; rank: number }>;
};

export type ProbabilityHistory = {
  simulations: number;
  points: HistoryPoint[];
};

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/**
 * 지정한 날짜까지 끝난 경기만으로 순위표를 복원한다. 순위는 KBO 규정
 * (승률 → 상대전적 → 다승) 그대로 매긴다.
 */
export function standingsAsOf(completed: Game[], asOf: string, teams: string[]): TeamStanding[] {
  const played = completed.filter(
    (game) => game.date <= asOf && game.awayScore !== null && game.homeScore !== null,
  );
  const h2h = buildHeadToHead(played);

  const tally = new Map(
    teams.map((team) => [team, { wins: 0, losses: 0, draws: 0 }]),
  );
  for (const game of played) {
    const away = tally.get(game.awayTeam);
    const home = tally.get(game.homeTeam);
    if (!away || !home) continue;
    if (game.awayScore! > game.homeScore!) {
      away.wins += 1;
      home.losses += 1;
    } else if (game.awayScore! < game.homeScore!) {
      home.wins += 1;
      away.losses += 1;
    } else {
      away.draws += 1;
      home.draws += 1;
    }
  }

  const rows = teams.map((team) => {
    const record = tally.get(team)!;
    return {
      // rank는 정렬 후에 채운다. 정렬 안정성을 위해 팀 이름 순서를 초기값으로 둔다.
      rank: teams.indexOf(team) + 1,
      team,
      games: record.wins + record.losses + record.draws,
      wins: record.wins,
      losses: record.losses,
      draws: record.draws,
      winRate: winningPercentage(record.wins, record.losses),
      gamesBehind: null as number | null,
      streak: "-",
    };
  });

  rows.sort((a, b) => compareForRank(a, b, h2h));

  const leader = rows[0];
  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    gamesBehind:
      index === 0
        ? null
        : (leader.wins - row.wins + (row.losses - leader.losses)) / 2,
  }));
}

/**
 * 시즌 첫 경기부터 오늘까지 7일 간격으로 잘라, 각 시점에서 남은 일정으로
 * 시뮬레이션을 다시 돌린다. "그때 그 시점에 이 팀의 전망은 어땠나"를 복원한다.
 */
export function buildProbabilityHistory(
  teams: string[],
  completed: Game[],
  scheduled: Game[],
  unscheduled: UnscheduledGame[],
  today: string,
): ProbabilityHistory {
  const dates = completed.map((game) => game.date).filter(Boolean).sort();
  if (dates.length === 0) return { simulations: HISTORY_SIMULATIONS, points: [] };

  const first = dates[0];
  const last = dates[dates.length - 1] < today ? today : dates[dates.length - 1];

  const cutoffs: string[] = [];
  // 첫 주는 표본이 너무 적어 확률이 의미가 없다. 2주차부터 찍는다.
  for (let cursor = addDays(first, 13); cursor < last; cursor = addDays(cursor, 7)) {
    cutoffs.push(cursor);
  }
  cutoffs.push(last);

  const points = cutoffs.map((cutoff) => {
    const played = completed.filter((game) => game.date <= cutoff);
    const notYetPlayed = completed.filter((game) => game.date > cutoff);
    const standings = standingsAsOf(completed, cutoff, teams);

    const result = simulateSeason(
      standings,
      [...notYetPlayed, ...scheduled],
      unscheduled,
      played,
      HISTORY_SIMULATIONS,
    );

    const byTeam: HistoryPoint["byTeam"] = {};
    for (const projection of result.projections) {
      const standing = standings.find((row) => row.team === projection.team);
      byTeam[projection.team] = {
        title: projection.titleProbability,
        playoff: projection.playoffProbability,
        rank: standing?.rank ?? PLAYOFF_SPOTS,
      };
    }

    return {
      date: cutoff,
      label: `${Number(cutoff.slice(5, 7))}.${cutoff.slice(8, 10)}`,
      gamesPlayed: played.length,
      byTeam,
    };
  });

  return { simulations: HISTORY_SIMULATIONS, points };
}
