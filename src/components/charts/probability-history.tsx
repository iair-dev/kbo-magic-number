"use client";

import { useMemo, useState } from "react";
import { TeamMark, formatPercent } from "@/components/ui";
import type { ProbabilityHistory } from "@/lib/race/history";

// viewBox 좌표계. 패널은 CSS로 늘어나고 내부 비율은 그대로 유지된다.
const W = 260;
const H = 84;
const TOP = 4;
const BOTTOM = 72;
const PLOT = BOTTOM - TOP;

const xAt = (index: number, count: number) => (count < 2 ? W / 2 : (index / (count - 1)) * W);
const yAt = (value: number) => TOP + (1 - value) * PLOT;

/**
 * 10개 팀은 카테고리 색 상한을 넘어 한 좌표축에 겹쳐 그릴 수 없다. 팀마다
 * 작은 패널을 하나씩 두고(스몰 멀티플) 축을 공유한다. 팀 구분은 색이 아니라
 * 패널 제목이 하고, 색은 우승/가을야구 두 계열에만 쓴다.
 */
export function ProbabilityHistoryChart({
  history,
  teams,
}: {
  history: ProbabilityHistory;
  teams: string[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const points = history.points;
  const count = points.length;

  const series = useMemo(
    () =>
      teams.map((team) => {
        const title = points.map((point) => point.byTeam[team]?.title ?? 0);
        const playoff = points.map((point) => point.byTeam[team]?.playoff ?? 0);

        // 아래 띠는 우승 확률, 위 띠는 가을야구 확률 중 우승을 뺀 나머지.
        const titleArea = [
          `M ${xAt(0, count)} ${yAt(title[0])}`,
          ...title.map((value, index) => `L ${xAt(index, count)} ${yAt(value)}`),
          `L ${xAt(count - 1, count)} ${BOTTOM}`,
          `L ${xAt(0, count)} ${BOTTOM}`,
          "Z",
        ].join(" ");

        const playoffArea = [
          `M ${xAt(0, count)} ${yAt(playoff[0])}`,
          ...playoff.map((value, index) => `L ${xAt(index, count)} ${yAt(value)}`),
          ...[...title].reverse().map((value, index) => `L ${xAt(count - 1 - index, count)} ${yAt(value)}`),
          "Z",
        ].join(" ");

        // 두 띠 사이는 선이 아니라 표면색 간격으로 가른다.
        const titleEdge = title
          .map((value, index) => `${index === 0 ? "M" : "L"} ${xAt(index, count)} ${yAt(value)}`)
          .join(" ");

        return { team, title, playoff, titleArea, playoffArea, titleEdge };
      }),
    [count, points, teams],
  );

  if (count === 0) {
    return <div className="empty-state">추이를 그릴 만한 경기 기록이 아직 없습니다.</div>;
  }

  const activePoint = active === null ? null : points[active];
  const shown = active ?? count - 1;

  function pick(event: React.MouseEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    setActive(Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1)))));
  }

  function step(event: React.KeyboardEvent<SVGSVGElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const base = active ?? count - 1;
    setActive(Math.max(0, Math.min(count - 1, base + (event.key === "ArrowRight" ? 1 : -1))));
  }

  return (
    <div className="chart-surface history-chart">
      <div className="history-toolbar">
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
        <div className="history-readout">
          <b>{activePoint ? `${activePoint.label} 기준` : `${points[count - 1].label} 최신`}</b>
          <span>{points[shown].gamesPlayed}경기 소화</span>
          <button type="button" aria-pressed={showTable} onClick={() => setShowTable((v) => !v)}>
            {showTable ? "그래프로 보기" : "표로 보기"}
          </button>
        </div>
      </div>

      {showTable ? (
        <div className="table-scroll">
          <table className="history-table">
            <caption className="visually-hidden">
              주차별 팀 우승 확률과 가을야구 진출 확률
            </caption>
            <thead>
              <tr>
                <th scope="col">주차</th>
                {teams.map((team) => (
                  <th scope="col" key={team}>
                    {team}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date}>
                  <th scope="row">{point.label}</th>
                  {teams.map((team) => (
                    <td key={team}>
                      <b>{formatPercent(point.byTeam[team]?.title ?? 0, 0)}</b>
                      <small>{formatPercent(point.byTeam[team]?.playoff ?? 0, 0)}</small>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="chart-note">굵은 값이 우승 확률, 아래 작은 값이 가을야구 진출 확률입니다.</p>
        </div>
      ) : (
        <>
          <div className="history-grid" onMouseLeave={() => setActive(null)}>
            {series.map((row) => (
              <article className="history-panel" key={row.team}>
                <header>
                  <span className="team-cell-static">
                    <TeamMark team={row.team} small />
                    <b>{row.team}</b>
                  </span>
                  <span className="history-values">
                    <b>{formatPercent(row.title[shown], 0)}</b>
                    <small>{formatPercent(row.playoff[shown], 0)}</small>
                  </span>
                </header>
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  role="img"
                  tabIndex={0}
                  aria-label={`${row.team} 주차별 확률 추이. ${points[shown].label} 기준 우승 ${formatPercent(row.title[shown])}, 가을야구 ${formatPercent(row.playoff[shown])}. 좌우 화살표로 주차를 옮길 수 있습니다.`}
                  onMouseMove={pick}
                  onKeyDown={step}
                  onFocus={() => setActive((current) => current ?? count - 1)}
                >
                  <line className="history-grid-line" x1="0" y1={yAt(0.5)} x2={W} y2={yAt(0.5)} />
                  <line className="history-axis" x1="0" y1={BOTTOM} x2={W} y2={BOTTOM} />
                  <path className="history-area history-area--playoff" d={row.playoffArea} />
                  <path className="history-area history-area--title" d={row.titleArea} />
                  {/* 표면색 2px 선으로 두 띠를 띄운다. 테두리가 아니라 간격이다. */}
                  <path className="history-gap" d={row.titleEdge} />
                  {active !== null && (
                    <g className="history-cursor">
                      <line x1={xAt(active, count)} y1={TOP} x2={xAt(active, count)} y2={BOTTOM} />
                      <circle cx={xAt(active, count)} cy={yAt(row.playoff[active])} r="3.5" className="history-dot history-dot--playoff" />
                      <circle cx={xAt(active, count)} cy={yAt(row.title[active])} r="3.5" className="history-dot history-dot--title" />
                    </g>
                  )}
                </svg>
                <div className="history-axis-labels" aria-hidden="true">
                  <span>{points[0].label}</span>
                  <span>{points[count - 1].label}</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <p className="chart-note">
        각 주차 시점의 순위를 완료 경기에서 역산하고, 그때 남아 있던 일정으로 다시
        시뮬레이션한 결과입니다. 주차별 {history.simulations.toLocaleString("ko-KR")}회,
        세로축은 0~100%입니다. 가운데 옅은 선이 50%입니다.
      </p>
    </div>
  );
}
