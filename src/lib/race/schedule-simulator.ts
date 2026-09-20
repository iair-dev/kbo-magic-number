import { winningPercentage } from "@/lib/race/core";
import { buildHeadToHead, type HeadToHead } from "@/lib/race/tiebreak";
import type { Game, TeamStanding, UnscheduledGame } from "@/lib/types";

export type GameOutcome = "away" | "draw" | "home";
export type GamePicks = Record<string, GameOutcome>;

/** 편성 확정 경기와 미편성 경기를 똑같이 찍을 수 있게 하는 최소 형태. */
export type Fixture = { id: string; awayTeam: string; homeTeam: string };

export type ProjectedStanding = TeamStanding & {
  currentRank: number;
  currentWins: number;
  currentLosses: number;
  currentDraws: number;
  remainingGames: number;
  projectedWins: number;
  projectedLosses: number;
  projectedDraws: number;
  rankChange: number;
  /** 동률이 상대전적으로 갈린 경우 표시용. */
  tiebreakApplied: boolean;
};

export function toFixtures(scheduled: Game[], unscheduled: UnscheduledGame[]): Fixture[] {
  return [
    ...scheduled.map((game) => ({ id: game.id, awayTeam: game.awayTeam, homeTeam: game.homeTeam })),
    ...unscheduled,
  ];
}

export function makeDefaultPicks(fixtures: Fixture[], standings: TeamStanding[]): GamePicks {
  const rateByTeam = new Map(standings.map((row) => [row.team, row.winRate]));
  return Object.fromEntries(
    fixtures.map((fixture) => {
      const awayRate = rateByTeam.get(fixture.awayTeam) ?? 0;
      const homeRate = rateByTeam.get(fixture.homeTeam) ?? 0;
      return [fixture.id, awayRate > homeRate ? "away" : "home"];
    }),
  );
}

export function projectStandings(
  standings: TeamStanding[],
  fixtures: Fixture[],
  picks: GamePicks,
  baseHeadToHead: HeadToHead,
): ProjectedStanding[] {
  const rows = new Map(
    standings.map((row) => [
      row.team,
      {
        ...row,
        currentRank: row.rank,
        currentWins: row.wins,
        currentLosses: row.losses,
        currentDraws: row.draws,
        remainingGames: 0,
        projectedWins: 0,
        projectedLosses: 0,
        projectedDraws: 0,
        rankChange: 0,
        tiebreakApplied: false,
      } satisfies ProjectedStanding,
    ]),
  );

  // 선택한 결과까지 반영한 상대전적. 동률 판정에 그대로 쓴다.
  const edge = new Map<string, number>();
  for (const [key, record] of baseHeadToHead) edge.set(key, record.wins - record.losses);
  const shift = (winner: string, loser: string) => {
    edge.set(`${winner}:${loser}`, (edge.get(`${winner}:${loser}`) ?? 0) + 1);
    edge.set(`${loser}:${winner}`, (edge.get(`${loser}:${winner}`) ?? 0) - 1);
  };

  for (const fixture of fixtures) {
    const away = rows.get(fixture.awayTeam);
    const home = rows.get(fixture.homeTeam);
    if (!away || !home) continue;
    away.remainingGames += 1;
    home.remainingGames += 1;

    const outcome = picks[fixture.id];
    if (outcome === "away") {
      away.projectedWins += 1;
      home.projectedLosses += 1;
      shift(fixture.awayTeam, fixture.homeTeam);
    } else if (outcome === "home") {
      home.projectedWins += 1;
      away.projectedLosses += 1;
      shift(fixture.homeTeam, fixture.awayTeam);
    } else {
      away.projectedDraws += 1;
      home.projectedDraws += 1;
    }
  }

  const projected = [...rows.values()].map((row) => {
    const wins = row.currentWins + row.projectedWins;
    const losses = row.currentLosses + row.projectedLosses;
    const draws = row.currentDraws + row.projectedDraws;
    return {
      ...row,
      games: wins + losses + draws,
      wins,
      losses,
      draws,
      winRate: winningPercentage(wins, losses),
    };
  });

  // KBO 규정: 승률 → 상대전적 → 다승 → (전년도 순위 대용) 현재 순위
  projected.sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    const pair = edge.get(`${a.team}:${b.team}`) ?? 0;
    if (pair !== 0) return -pair;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.currentRank - b.currentRank;
  });

  return projected.map((row, index) => {
    const neighbours = projected.filter(
      (other) => other.team !== row.team && other.winRate === row.winRate,
    );
    return {
      ...row,
      rank: index + 1,
      rankChange: row.currentRank - (index + 1),
      tiebreakApplied: neighbours.length > 0,
    };
  });
}

export function remainingMatchupMatrix(fixtures: Fixture[], teams: string[]) {
  const matrix = new Map<string, number>();
  for (const fixture of fixtures) {
    const forward = `${fixture.awayTeam}:${fixture.homeTeam}`;
    const backward = `${fixture.homeTeam}:${fixture.awayTeam}`;
    matrix.set(forward, (matrix.get(forward) ?? 0) + 1);
    matrix.set(backward, (matrix.get(backward) ?? 0) + 1);
  }
  return teams.map((team) => ({
    team,
    total: fixtures.filter((fixture) => fixture.awayTeam === team || fixture.homeTeam === team).length,
    opponents: Object.fromEntries(
      teams.map((opponent) => [opponent, matrix.get(`${team}:${opponent}`) ?? 0]),
    ),
  }));
}

export { buildHeadToHead };
