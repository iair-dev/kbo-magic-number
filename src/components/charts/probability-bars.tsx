"use client";

import { ChartTooltip, useChartTooltip } from "@/components/charts/tooltip";
import { TeamMark, formatPercent, formatRate } from "@/components/ui";
import type { TeamProjection } from "@/lib/race/monte-carlo";

const TICKS = [0, 25, 50, 75, 100];
/** 이보다 좁은 구간에 라벨을 넣으면 글자가 잘린다. 밖으로 빼거나 생략한다. */
const INLINE_LABEL_MIN = 16;

export function ProbabilityBars({ projections }: { projections: TeamProjection[] }) {
  const { tooltip, handlers } = useChartTooltip();
  const rows = [...projections].sort(
    (a, b) =>
      b.playoffProbability - a.playoffProbability || b.titleProbability - a.titleProbability,
  );

  return (
    <div className="chart-surface prob-chart">
      <div className="chart-legend">
        <span>
          <i className="swatch swatch--title" aria-hidden="true" />
          우승 확률
        </span>
        <span>
          <i className="swatch swatch--playoff" aria-hidden="true" />
          가을야구 진출 확률
        </span>
      </div>

      <div className="prob-grid">
        {TICKS.map((tick) => (
          <span className="prob-gridline" style={{ left: `${tick}%` }} key={tick} aria-hidden="true" />
        ))}

        {rows.map((row) => {
          const title = row.titleProbability * 100;
          const playoff = row.playoffProbability * 100;
          const rest = Math.max(0, playoff - title);
          return (
            <div className="prob-row" key={row.team}>
              <span className="prob-team">
                <TeamMark team={row.team} small />
                <b>{row.team}</b>
              </span>
              <span
                className="prob-track"
                tabIndex={0}
                role="img"
                aria-label={`${row.team} 우승 확률 ${formatPercent(row.titleProbability)}, 가을야구 진출 확률 ${formatPercent(row.playoffProbability)}`}
                onMouseEnter={(event) =>
                  handlers.onMouseEnter(event, <TooltipBody row={row} />)
                }
                onFocus={(event) => handlers.onFocus(event, <TooltipBody row={row} />)}
                onMouseLeave={handlers.onMouseLeave}
                onBlur={handlers.onBlur}
              >
                {title > 0 && (
                  <span className="prob-fill prob-fill--title" style={{ width: `${title}%` }}>
                    {title >= INLINE_LABEL_MIN && <b>{formatPercent(row.titleProbability, 0)}</b>}
                  </span>
                )}
                {rest > 0 && (
                  <span
                    className="prob-fill prob-fill--playoff"
                    style={{ width: `${rest}%`, marginLeft: title > 0 ? 2 : 0 }}
                  />
                )}
              </span>
              <span className="prob-value">{formatPercent(row.playoffProbability, 0)}</span>
            </div>
          );
        })}

        <div className="prob-axis" aria-hidden="true">
          {TICKS.map((tick) => (
            <span style={{ left: `${tick}%` }} key={tick}>
              {tick}%
            </span>
          ))}
        </div>
      </div>

      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

function TooltipBody({ row }: { row: TeamProjection }) {
  return (
    <>
      <strong>{row.team}</strong>
      <dl>
        <div>
          <dt>우승</dt>
          <dd>{formatPercent(row.titleProbability)}</dd>
        </div>
        <div>
          <dt>가을야구</dt>
          <dd>{formatPercent(row.playoffProbability)}</dd>
        </div>
        <div>
          <dt>예상 성적</dt>
          <dd>
            {row.expectedWins.toFixed(1)}승 {row.expectedLosses.toFixed(1)}패 ·{" "}
            {formatRate(row.expectedWinRate)}
          </dd>
        </div>
        <div>
          <dt>순위 구간</dt>
          <dd>
            중앙 {row.medianRank}위 · {row.rankRange[0]}~{row.rankRange[1]}위
          </dd>
        </div>
      </dl>
    </>
  );
}
