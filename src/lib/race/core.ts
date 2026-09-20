import { SEASON_GAMES, type Game, type TeamStanding, type UnscheduledGame } from "@/lib/types";

/** KBO 승률은 무승부를 제외한 승 / (승+패). */
export function winningPercentage(wins: number, losses: number) {
  const decisions = wins + losses;
  return decisions === 0 ? 0 : wins / decisions;
}

/** 편성 여부와 무관한 실제 잔여 경기 수. 편성 미정 경기까지 포함한다. */
export function trueRemaining(standing: TeamStanding) {
  return Math.max(0, SEASON_GAMES - standing.games);
}

export function involves(game: { awayTeam: string; homeTeam: string }, team: string) {
  return game.awayTeam === team || game.homeTeam === team;
}

export function opponentOf(game: { awayTeam: string; homeTeam: string }, team: string) {
  return game.homeTeam === team ? game.awayTeam : game.homeTeam;
}

export function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** 편성 확정 + 미정을 합친 팀별 잔여 대진 수. */
export function remainingByOpponent(
  team: string,
  scheduled: Game[],
  unscheduled: UnscheduledGame[],
) {
  const counts = new Map<string, number>();
  for (const game of [...scheduled, ...unscheduled]) {
    if (!involves(game, team)) continue;
    const opponent = opponentOf(game, team);
    counts.set(opponent, (counts.get(opponent) ?? 0) + 1);
  }
  return counts;
}
