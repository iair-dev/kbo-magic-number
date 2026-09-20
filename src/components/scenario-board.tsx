"use client";

import { useMemo } from "react";
import { SectionHeading, formatRate } from "@/components/ui";
import type { ProjectedStanding } from "@/lib/race/schedule-simulator";
import { TEAM_META, type TeamStanding } from "@/lib/types";

const ROW_HEIGHT = 32;

export function ScenarioBoard({
  standings,
  projections,
  remainingByTeam,
  opponentsByTeam,
  onSelectWins,
}: {
  standings: TeamStanding[];
  projections: Map<string, ProjectedStanding>;
  remainingByTeam: Map<string, number>;
  opponentsByTeam: Map<string, Map<string, number>>;
  onSelectWins: (team: string, wins: number) => void;
}) {
  // 모든 팀의 가능한 승률을 한 축에 모아야 열끼리 높이가 맞는다.
  const scale = useMemo(() => {
    const buckets = new Set<string>();
    for (const standing of standings) {
      const remaining = remainingByTeam.get(standing.team) ?? 0;
      for (let wins = 0; wins <= remaining; wins += 1) {
        buckets.add(
          ((standing.wins + wins) / (standing.wins + standing.losses + remaining)).toFixed(3),
        );
      }
    }
    const sorted = [...buckets].sort((a, b) => Number(b) - Number(a));
    return { buckets: sorted, height: sorted.length * ROW_HEIGHT };
  }, [remainingByTeam, standings]);

  return (
    <section className="scenario-section" id="scenario">
      <SectionHeading
        kicker="WINNING PERCENTAGE TABLE"
        title="팀별 승패 시나리오"
        aside="승·패 행을 선택하세요"
        description="한 행을 누르면 그 팀의 잔여 승수를 그만큼 맞추고, 상대 팀 승패까지 함께 바뀝니다."
      />
      <div className="panel scenario-board">
        <div className="scenario-scroll">
          {standings.map((standing) => {
            const projected = projections.get(standing.team);
            const remaining = remainingByTeam.get(standing.team) ?? 0;
            const selectedWins = projected?.projectedWins ?? 0;
            const opponents = opponentsByTeam.get(standing.team) ?? new Map();
            const meta = TEAM_META[standing.team];
            const color = meta?.color ?? "#334155";
            const ink = meta?.ink ?? "#ffffff";

            return (
              <article className="scenario-column" key={standing.team}>
                <div className="scenario-current">
                  <span>{formatRate(standing.winRate)}</span>
                  <strong>{standing.rank}위</strong>
                  <small>시나리오 {projected?.rank ?? standing.rank}위</small>
                </div>
                <div className="scenario-record">
                  <b>{standing.wins}</b>
                  <b>{standing.draws}</b>
                  <b>{standing.losses}</b>
                  <span>승</span>
                  <span>무</span>
                  <span>패</span>
                </div>
                <div className="scenario-team" style={{ backgroundColor: color, color: ink }}>
                  {standing.team}
                </div>
                <div className="scenario-remaining">
                  <span>잔여경기</span>
                  <strong>{remaining}</strong>
                </div>
                <div className="scenario-labels">
                  <span>승</span>
                  <span>패</span>
                  <span>승률</span>
                </div>
                <div className="scenario-options" style={{ height: `${scale.height}px` }}>
                  {Array.from({ length: remaining + 1 }, (_, index) => remaining - index).map(
                    (wins) => {
                      const losses = remaining - wins;
                      const rate =
                        (standing.wins + wins) / (standing.wins + standing.losses + remaining);
                      const band = scale.buckets.indexOf(rate.toFixed(3));
                      const selected = wins === selectedWins;
                      return (
                        <button
                          type="button"
                          key={wins}
                          className={selected ? "selected" : ""}
                          style={{ top: `${band * ROW_HEIGHT}px` }}
                          aria-pressed={selected}
                          onClick={() => onSelectWins(standing.team, wins)}
                          aria-label={`${standing.team} 잔여 ${wins}승 ${losses}패, 최종 승률 ${formatRate(rate)}`}
                        >
                          <span>{wins}</span>
                          <span>{losses}</span>
                          <strong>{formatRate(rate)}</strong>
                        </button>
                      );
                    },
                  )}
                </div>
                <div className="scenario-opponents-title">잔여 대진</div>
                <div className="scenario-opponents">
                  {[...opponents.entries()]
                    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                    .map(([opponent, count]) => (
                      <div key={opponent}>
                        <span
                          className="opponent-color"
                          style={{ backgroundColor: TEAM_META[opponent]?.color }}
                          aria-hidden="true"
                        />
                        <span>{opponent}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <p className="scroll-hint" aria-hidden="true">← 좌우로 밀어서 10개 팀 모두 보기 →</p>
    </section>
  );
}
