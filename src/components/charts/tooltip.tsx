"use client";

import { useState } from "react";

export type TooltipState = { x: number; y: number; content: React.ReactNode } | null;

/**
 * 호버와 키보드 포커스에 같은 내용을 띄운다. 값 자체는 항상 직접 라벨이나
 * 표로도 읽을 수 있으므로 툴팁은 보조 수단이다.
 */
export function useChartTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  function show(event: React.MouseEvent | React.FocusEvent, content: React.ReactNode) {
    const target = event.currentTarget as HTMLElement;
    const host = target.closest(".chart-surface") as HTMLElement | null;
    if (!host) return;
    const box = target.getBoundingClientRect();
    const frame = host.getBoundingClientRect();
    setTooltip({
      x: box.left - frame.left + box.width / 2,
      y: box.top - frame.top,
      content,
    });
  }

  const handlers = {
    onMouseEnter: show,
    onFocus: show,
    onMouseLeave: () => setTooltip(null),
    onBlur: () => setTooltip(null),
  };

  return { tooltip, handlers, clear: () => setTooltip(null) };
}

export function ChartTooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip) return null;
  return (
    <div className="chart-tooltip" style={{ left: tooltip.x, top: tooltip.y }} role="presentation">
      {tooltip.content}
    </div>
  );
}
