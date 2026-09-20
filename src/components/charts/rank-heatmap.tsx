"use client";

import { ChartTooltip, useChartTooltip } from "@/components/charts/tooltip";
import { TeamMark, formatPercent } from "@/components/ui";
import type { TeamProjection } from "@/lib/race/monte-carlo";
import { PLAYOFF_SPOTS } from "@/lib/types";

/** 확률 구간별 단일 색조 램프. 진할수록 확률이 높다. */
const BANDS = [0.001, 0.01, 0.05, 0.15, 0.35, 0.6, 0.85];

function band(value: number) {
  if (value <= 0) return 0;
  return BANDS.filter((edge) => value >= edge).length;
}

function cellLabel(value: number) {
  if (value <= 0) return "";
  if (value < 0.005) return "·";
  return String(Math.round(value * 100));
}

export function RankHeatmap({ projections }: { projections: TeamProjection[] }) {
  const { tooltip, handlers } = useChartTooltip();
  const rows = [...projections].sort((a, b) => a.medianRank - b.medianRank || b.expectedWins - a.expectedWins);
  const ranks = Array.from({ length: projections.length }, (_, index) => index + 1);

  return (
    <div className="chart-surface heatmap-chart">
      <div className="chart-legend heatmap-legend">
        <span>확률 낮음</span>
        {[1, 2, 3, 4, 5, 6, 7].map((step) => (
          <i className={`swatch heat-${step}`} key={step} aria-hidden="true" />
        ))}
        <span>높음</span>
      </div>

      <div className="table-scroll">
        <table className="heatmap-table">
          <caption className="visually-hidden">
            팀별 최종 순위 확률 분포. 각 칸은 해당 순위로 시즌을 마칠 확률(%)입니다.
          </caption>
          <thead>
            <tr>
              <th scope="col">팀</th>
              {ranks.map((rank) => (
                <th
                  scope="col"
                  key={rank}
                  className={rank === PLAYOFF_SPOTS ? "playoff-edge" : undefined}
                >
                  {rank}위
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team}>
                <th scope="row">
                  <span className="team-cell-static">
                    <TeamMark team={row.team} small />
                    <b>{row.team}</b>
                  </span>
                </th>
                {ranks.map((rank) => {
                  const value = row.rankDistribution[rank - 1] ?? 0;
                  return (
                    <td
                      key={rank}
                      className={`heat-${band(value)}${rank === PLAYOFF_SPOTS ? " playoff-edge" : ""}`}
                      tabIndex={value > 0 ? 0 : -1}
                      onMouseEnter={(event) =>
                        handlers.onMouseEnter(
                          event,
                          <TooltipBody team={row.team} rank={rank} value={value} />,
                        )
                      }
                      onFocus={(event) =>
                        handlers.onFocus(
                          event,
                          <TooltipBody team={row.team} rank={rank} value={value} />,
                        )
                      }
                      onMouseLeave={handlers.onMouseLeave}
                      onBlur={handlers.onBlur}
                    >
                      <span className="visually-hidden">
                        {row.team} {rank}위 {formatPercent(value)}
                      </span>
                      <span aria-hidden="true">{cellLabel(value)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="chart-note">
        세로 구분선 왼쪽 <b>5위까지가 가을야구</b>입니다. 숫자는 % 단위이며 0.5% 미만은 ·로 표시합니다.
      </p>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function TooltipBody({ team, rank, value }: { team: string; rank: number; value: number }) {
  return (
    <>
      <strong>
        {team} · {rank}위
      </strong>
      <dl>
        <div>
          <dt>확률</dt>
          <dd>{formatPercent(value)}</dd>
        </div>
      </dl>
    </>
  );
}
