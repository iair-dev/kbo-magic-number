"use client";

import { TEAM_META } from "@/lib/types";

export function TeamMark({ team, small = false }: { team: string; small?: boolean }) {
  const meta = TEAM_META[team] ?? { color: "#334155", ink: "#ffffff", short: team };
  const label = meta.short.slice(0, 3);
  return (
    <span
      className={`team-mark${small ? " team-mark--small" : ""}`}
      style={{ backgroundColor: meta.color, color: meta.ink }}
      data-length={label.length}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

/** KBO 표기 관례대로 앞의 0을 뗀 승률. */
export function formatRate(rate: number) {
  return rate.toFixed(3).replace(/^0/, "");
}

export function formatPercent(value: number, digits = 1) {
  if (value > 0 && value < 0.001) return "<0.1%";
  if (value < 1 && value > 0.999) return ">99.9%";
  return `${(value * 100).toFixed(digits)}%`;
}

export function SectionHeading({
  kicker,
  title,
  aside,
  description,
}: {
  kicker: string;
  title: string;
  aside?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="section-kicker">{kicker}</p>
        <h2>{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
      {aside && <span className="section-aside">{aside}</span>}
    </div>
  );
}

const STATUS_ICON = { good: "●", warning: "▲", critical: "■", neutral: "○" } as const;

/** 상태는 색만으로 구분하지 않는다. 아이콘과 문구를 항상 함께 붙인다. */
export function StatusPill({
  tone,
  children,
}: {
  tone: keyof typeof STATUS_ICON;
  children: React.ReactNode;
}) {
  return (
    <span className={`status-pill status-pill--${tone}`}>
      <span aria-hidden="true">{STATUS_ICON[tone]}</span>
      {children}
    </span>
  );
}
