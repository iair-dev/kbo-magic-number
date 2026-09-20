import { trueRemaining, winningPercentage } from "@/lib/race/core";
import { PLAYOFF_SPOTS, type TeamStanding } from "@/lib/types";

export type PairNumbers = {
  opponent: string;
  /**
   * 상대보다 확실히 앞서기까지 남은 "우리 승 + 상대 패" 횟수.
   * 0이면 이미 확정, null이면 남은 경기로는 확정이 불가능하다.
   */
  magic: number | null;
  /** 상대에게 확실히 뒤지기까지 남은 "우리 패 + 상대 승" 횟수. 0이면 이미 탈락. */
  tragic: number | null;
};

export type TeamNumbers = {
  team: string;
  remaining: number;
  pairs: PairNumbers[];
  /** 우승(1위) 확정 매직넘버. */
  titleMagic: number | null;
  /** 포스트시즌(5위 이내) 확정 매직넘버. */
  playoffMagic: number | null;
  /** 우승 경쟁에서 탈락하기까지 남은 횟수. */
  titleTragic: number | null;
  /** 포스트시즌 경쟁에서 탈락하기까지 남은 횟수. */
  playoffTragic: number | null;
  status: "title-clinched" | "playoff-clinched" | "contending" | "playoff-eliminated";
};

/**
 * 매직넘버는 승률 우위를 확정하는 보수적 기준으로 계산한다. 동률은 상대전적으로
 * 갈리지만 잔여 맞대결 결과에 따라 뒤집힐 수 있으므로 확정 판정에 넣지 않는다.
 */
function aheadFor(aWins: number, aLosses: number, bWins: number, bLosses: number) {
  return winningPercentage(aWins, aLosses) > winningPercentage(bWins, bLosses);
}

/**
 * 잔여 경기 수가 한 자릿수~십몇 경기라 전수 탐색이 가장 정확하고 충분히 빠르다.
 * `a`는 우리 승수, `b`는 상대 패수이고 매직넘버는 "확정되지 않는 최대 a+b" + 1이다.
 */
function pairNumbers(a: TeamStanding, b: TeamStanding): PairNumbers {
  const ra = trueRemaining(a);
  const rb = trueRemaining(b);

  let worstUnclinched = -1;
  let bestUneliminated = -1;

  for (let wins = 0; wins <= ra; wins += 1) {
    for (let rivalLosses = 0; rivalLosses <= rb; rivalLosses += 1) {
      // 매직넘버: 우리가 wins만큼 이기고 나머지를 모두 지며, 상대는
      // rivalLosses만큼 지고 나머지를 모두 이기는 최악의 전개.
      const clinched = aheadFor(
        a.wins + wins,
        a.losses + (ra - wins),
        b.wins + (rb - rivalLosses),
        b.losses + rivalLosses,
      );
      if (!clinched) worstUnclinched = Math.max(worstUnclinched, wins + rivalLosses);

      // 트래직넘버: 우리가 wins만큼 지고 나머지를 모두 이기며, 상대는
      // rivalLosses만큼 이기고 나머지를 모두 지는 최선의 전개.
      const alive = !aheadFor(
        b.wins + rivalLosses,
        b.losses + (rb - rivalLosses),
        a.wins + (ra - wins),
        a.losses + wins,
      );
      if (alive) bestUneliminated = Math.max(bestUneliminated, wins + rivalLosses);
    }
  }

  const maxEvents = ra + rb;
  return {
    opponent: b.team,
    magic: worstUnclinched >= maxEvents ? null : worstUnclinched + 1,
    tragic: bestUneliminated >= maxEvents ? null : bestUneliminated + 1,
  };
}

/**
 * 순위 k 이내를 확정하려면 9개 상대 중 (10 - k)개 상대를 확실히 제쳐야 한다.
 * 따라서 매직넘버는 상대별 매직넘버 중 (10 - k)번째로 작은 값이다.
 */
function nthSmallest(values: (number | null)[], nth: number) {
  const sorted = [...values].sort((x, y) => {
    if (x === null) return 1;
    if (y === null) return -1;
    return x - y;
  });
  return sorted[nth - 1] ?? null;
}

export function computeTeamNumbers(standings: TeamStanding[]): TeamNumbers[] {
  const teamCount = standings.length;

  return standings.map((team) => {
    const pairs = standings
      .filter((rival) => rival.team !== team.team)
      .map((rival) => pairNumbers(team, rival));

    const magics = pairs.map((pair) => pair.magic);
    const tragics = pairs.map((pair) => pair.tragic);

    const titleMagic = nthSmallest(magics, teamCount - 1);
    const playoffMagic = nthSmallest(magics, teamCount - PLAYOFF_SPOTS);
    const titleTragic = nthSmallest(tragics, 1);
    const playoffTragic = nthSmallest(tragics, PLAYOFF_SPOTS);

    const status: TeamNumbers["status"] =
      titleMagic === 0
        ? "title-clinched"
        : playoffMagic === 0
          ? "playoff-clinched"
          : playoffTragic === 0
            ? "playoff-eliminated"
            : "contending";

    return {
      team: team.team,
      remaining: trueRemaining(team),
      pairs,
      titleMagic,
      playoffMagic,
      titleTragic,
      playoffTragic,
      status,
    };
  });
}
