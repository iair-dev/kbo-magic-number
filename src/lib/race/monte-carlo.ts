import { winningPercentage } from "@/lib/race/core";
import { leagueTendencies } from "@/lib/race/stats";
import { buildHeadToHead, headToHeadEdge } from "@/lib/race/tiebreak";
import { PLAYOFF_SPOTS, type Game, type TeamStanding, type UnscheduledGame } from "@/lib/types";

export const SIMULATIONS = 20_000;

/**
 * 관측 승률을 .500 쪽으로 되돌릴 때 쓰는 가상 경기 수. 130경기 안팎을 치른
 * 시점에서도 팀 실력 추정치가 표본 잡음을 과신하지 않게 한다.
 */
const PRIOR_GAMES = 60;

export type TeamProjection = {
  team: string;
  /** rankDistribution[i] = 최종 i+1위로 끝날 확률. */
  rankDistribution: number[];
  titleProbability: number;
  playoffProbability: number;
  expectedWins: number;
  expectedLosses: number;
  expectedWinRate: number;
  medianRank: number;
  /** 5~95 백분위 순위 구간. */
  rankRange: [number, number];
};

export type SimulationResult = {
  simulations: number;
  projections: TeamProjection[];
  /** 시뮬레이션에 쓴 리그 모수. 화면에 근거로 노출한다. */
  model: { homeWinRate: number; drawRate: number; priorGames: number };
};

/** 결정적 난수. 같은 입력이면 항상 같은 확률이 나오도록 시드를 고정한다. */
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Bill James log5: 승률 a인 팀이 승률 b인 팀을 중립 구장에서 이길 확률. */
function log5(a: number, b: number) {
  const denominator = a + b - 2 * a * b;
  return denominator === 0 ? 0.5 : (a - a * b) / denominator;
}

export function simulateSeason(
  standings: TeamStanding[],
  scheduled: Game[],
  unscheduled: UnscheduledGame[],
  completed: Game[],
): SimulationResult {
  const teams = standings.map((row) => row.team);
  const teamCount = teams.length;
  const indexOf = new Map(teams.map((team, index) => [team, index]));

  const league = leagueTendencies(completed);
  const homeEdge = logit(Math.min(0.65, Math.max(0.35, league.homeWinRate)));
  const drawRate = Math.min(0.1, league.drawRate);

  // 실력 추정치와 경기별 확률은 시뮬레이션 밖에서 한 번만 계산한다.
  const strength = standings.map(
    (row) => (row.wins + 0.5 * PRIOR_GAMES) / (row.wins + row.losses + PRIOR_GAMES),
  );

  const fixtures = [...scheduled, ...unscheduled].flatMap((game) => {
    const home = indexOf.get(game.homeTeam);
    const away = indexOf.get(game.awayTeam);
    if (home === undefined || away === undefined) return [];
    const neutral = log5(strength[home], strength[away]);
    const pHome = (1 - drawRate) * sigmoid(logit(neutral) + homeEdge);
    return [{ home, away, pHome, pDecided: 1 - drawRate }];
  });

  const baseWins = Int32Array.from(standings.map((row) => row.wins));
  const baseLosses = Int32Array.from(standings.map((row) => row.losses));
  const currentRank = Int32Array.from(standings.map((row) => row.rank));

  // 기존 상대전적을 미리 행렬로 펴두고, 시뮬레이션마다 복사해서 이어 쓴다.
  const h2h = buildHeadToHead(completed);
  const baseEdge = new Int32Array(teamCount * teamCount);
  for (let a = 0; a < teamCount; a += 1) {
    for (let b = 0; b < teamCount; b += 1) {
      if (a !== b) baseEdge[a * teamCount + b] = headToHeadEdge(h2h, teams[a], teams[b]);
    }
  }

  const rankCounts = Array.from({ length: teamCount }, () => new Int32Array(teamCount));
  const winTotals = new Float64Array(teamCount);
  const lossTotals = new Float64Array(teamCount);

  const wins = new Int32Array(teamCount);
  const losses = new Int32Array(teamCount);
  const edge = new Int32Array(teamCount * teamCount);
  const rate = new Float64Array(teamCount);
  const order = Array.from({ length: teamCount }, (_, index) => index);
  const random = mulberry32(0x4b424f21);

  for (let run = 0; run < SIMULATIONS; run += 1) {
    wins.set(baseWins);
    losses.set(baseLosses);
    edge.set(baseEdge);

    for (const fixture of fixtures) {
      const roll = random();
      if (roll >= fixture.pDecided) continue; // 무승부는 승률에 영향이 없다
      if (roll < fixture.pHome) {
        wins[fixture.home] += 1;
        losses[fixture.away] += 1;
        edge[fixture.home * teamCount + fixture.away] += 1;
        edge[fixture.away * teamCount + fixture.home] -= 1;
      } else {
        wins[fixture.away] += 1;
        losses[fixture.home] += 1;
        edge[fixture.away * teamCount + fixture.home] += 1;
        edge[fixture.home * teamCount + fixture.away] -= 1;
      }
    }

    for (let team = 0; team < teamCount; team += 1) {
      rate[team] = winningPercentage(wins[team], losses[team]);
      winTotals[team] += wins[team];
      lossTotals[team] += losses[team];
    }

    // KBO 규정: 승률 → 상대전적 → 다승 → (전년도 순위 대용) 현재 순위
    order.sort((a, b) => {
      if (rate[b] !== rate[a]) return rate[b] - rate[a];
      const pair = edge[a * teamCount + b];
      if (pair !== 0) return -pair;
      if (wins[b] !== wins[a]) return wins[b] - wins[a];
      return currentRank[a] - currentRank[b];
    });

    for (let position = 0; position < teamCount; position += 1) {
      rankCounts[order[position]][position] += 1;
    }
  }

  const projections = standings.map((row, team) => {
    const counts = rankCounts[team];
    const rankDistribution = Array.from(counts, (count) => count / SIMULATIONS);

    let cumulative = 0;
    let median = teamCount;
    let low = 1;
    let high = teamCount;
    let lowSet = false;
    for (let position = 0; position < teamCount; position += 1) {
      const before = cumulative;
      cumulative += rankDistribution[position];
      if (!lowSet && cumulative >= 0.05) {
        low = position + 1;
        lowSet = true;
      }
      if (before < 0.5 && cumulative >= 0.5) median = position + 1;
      if (before < 0.95 && cumulative >= 0.95) {
        high = position + 1;
        break;
      }
    }

    const expectedWins = winTotals[team] / SIMULATIONS;
    const expectedLosses = lossTotals[team] / SIMULATIONS;

    return {
      team: row.team,
      rankDistribution,
      titleProbability: rankDistribution[0],
      playoffProbability: rankDistribution
        .slice(0, PLAYOFF_SPOTS)
        .reduce((sum, value) => sum + value, 0),
      expectedWins,
      expectedLosses,
      expectedWinRate: winningPercentage(expectedWins, expectedLosses),
      medianRank: median,
      rankRange: [low, high] as [number, number],
    };
  });

  return {
    simulations: SIMULATIONS,
    projections,
    model: { homeWinRate: league.homeWinRate, drawRate, priorGames: PRIOR_GAMES },
  };
}
