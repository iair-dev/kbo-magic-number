import type { Game, TeamStanding } from "@/lib/types";

export type PairRecord = { wins: number; losses: number; draws: number };
/** `${A}:${B}` → A가 B를 상대로 거둔 전적. */
export type HeadToHead = Map<string, PairRecord>;

const key = (a: string, b: string) => `${a}:${b}`;

export function buildHeadToHead(games: Game[]): HeadToHead {
  const h2h: HeadToHead = new Map();
  const bump = (a: string, b: string, field: keyof PairRecord) => {
    const k = key(a, b);
    const record = h2h.get(k) ?? { wins: 0, losses: 0, draws: 0 };
    record[field] += 1;
    h2h.set(k, record);
  };

  for (const game of games) {
    if (game.status !== "completed" || game.awayScore === null || game.homeScore === null) continue;
    const { awayTeam: away, homeTeam: home } = game;
    if (game.awayScore > game.homeScore) {
      bump(away, home, "wins");
      bump(home, away, "losses");
    } else if (game.awayScore < game.homeScore) {
      bump(home, away, "wins");
      bump(away, home, "losses");
    } else {
      bump(away, home, "draws");
      bump(home, away, "draws");
    }
  }
  return h2h;
}

export function pairRecord(h2h: HeadToHead, a: string, b: string): PairRecord {
  return h2h.get(key(a, b)) ?? { wins: 0, losses: 0, draws: 0 };
}

/** 상대전적 우위. A 우위면 양수, B 우위면 음수. */
export function headToHeadEdge(h2h: HeadToHead, a: string, b: string) {
  const record = pairRecord(h2h, a, b);
  return record.wins - record.losses;
}

/**
 * KBO 정규시즌 순위 규정: 승률 → 상대전적 → 다승 → 전년도 순위.
 * 전년도 순위 데이터가 없어 현재 순위를 최종 안정 정렬 기준으로 쓴다.
 */
export function compareForRank(
  a: { team: string; winRate: number; wins: number; rank: number },
  b: { team: string; winRate: number; wins: number; rank: number },
  h2h: HeadToHead,
) {
  if (b.winRate !== a.winRate) return b.winRate - a.winRate;
  const edge = headToHeadEdge(h2h, a.team, b.team);
  if (edge !== 0) return -edge;
  if (b.wins !== a.wins) return b.wins - a.wins;
  return a.rank - b.rank;
}

/** 현재 순위표를 KBO 규정으로 다시 정렬해 동률 구간을 찾는다. */
export function tiedGroups(standings: TeamStanding[]) {
  const groups = new Map<string, string[]>();
  for (const row of standings) {
    const bucket = row.winRate.toFixed(6);
    groups.set(bucket, [...(groups.get(bucket) ?? []), row.team]);
  }
  return [...groups.values()].filter((teams) => teams.length > 1);
}
