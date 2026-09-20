"use client";

import { TeamMark, formatRate } from "@/components/ui";
import type { ProjectedStanding } from "@/lib/race/schedule-simulator";
import { PLAYOFF_SPOTS } from "@/lib/types";

function rankMovement(change: number) {
  if (change > 0) return <span className="rank-up">▲ {change}</span>;
  if (change < 0) return <span className="rank-down">▼ {Math.abs(change)}</span>;
  return <span className="rank-same">—</span>;
}

export function ProjectionTable({
  projections,
  onAdjustWins,
  onReset,
  onApplyAll,
}: {
  projections: ProjectedStanding[];
  onAdjustWins: (team: string, direction: -1 | 1) => void;
  onReset: () => void;
  onApplyAll: (outcome: "away" | "home") => void;
}) {
  return (
    <section className="panel projection-panel" id="projection">
      <div className="projection-toolbar">
        <h2>시나리오 최종 순위</h2>
        <div className="simulation-actions">
          <button type="button" onClick={() => onApplyAll("away")}>
            전체 원정승
          </button>
          <button type="button" onClick={() => onApplyAll("home")}>
            전체 홈승
          </button>
          <button className="primary" type="button" onClick={onReset}>
            승률 높은 팀 승리로 되돌리기
          </button>
        </div>
      </div>

      <div className="table-scroll">
        <table className="projection-table">
          <thead>
            <tr>
              <th scope="col">예상 순위</th>
              <th scope="col">팀</th>
              <th scope="col">현재 순위</th>
              <th scope="col">현재 성적</th>
              <th scope="col">잔여</th>
              <th scope="col">선택 승패</th>
              <th scope="col">최종 성적</th>
              <th scope="col">최종 승률</th>
              <th scope="col">순위 변동</th>
            </tr>
          </thead>
          <tbody>
            {projections.map((row) => (
              <tr key={row.team} className={row.rank === PLAYOFF_SPOTS ? "playoff-cut" : undefined}>
                <td className="projected-rank">{row.rank}</td>
                <td>
                  <span className="team-cell-static">
                    <TeamMark team={row.team} small />
                    <b>{row.team}</b>
                  </span>
                </td>
                <td>{row.currentRank}위</td>
                <td>
                  {row.currentWins}-{row.currentLosses}-{row.currentDraws}
                </td>
                <td>{row.remainingGames}</td>
                <td className="picked-record">
                  <span className="record-stepper">
                    <button
                      type="button"
                      onClick={() => onAdjustWins(row.team, -1)}
                      disabled={row.projectedWins === 0}
                      aria-label={`${row.team} 시나리오 승수 하나 줄이기`}
                    >
                      −
                    </button>
                    <span>
                      <b>{row.projectedWins}승</b> {row.projectedLosses}패
                      {row.projectedDraws > 0 ? ` ${row.projectedDraws}무` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdjustWins(row.team, 1)}
                      disabled={row.projectedWins === row.remainingGames}
                      aria-label={`${row.team} 시나리오 승수 하나 늘리기`}
                    >
                      +
                    </button>
                  </span>
                </td>
                <td>
                  <b>
                    {row.wins}-{row.losses}-{row.draws}
                  </b>
                </td>
                <td className="projected-rate">{formatRate(row.winRate)}</td>
                <td>{rankMovement(row.rankChange)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-footnote">
        굵은 구분선 위쪽 {PLAYOFF_SPOTS}팀이 가을야구에 진출합니다. 동률은 KBO 규정대로 상대전적 →
        다승 순으로 가리며, 선택한 잔여 경기 결과까지 상대전적에 반영합니다.
      </p>
    </section>
  );
}
