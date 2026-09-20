"use client";

import { useEffect, useRef, useState } from "react";

/** 화면에 실린 데이터 목록. 순서는 본문 순서와 같아야 한다. */
const SECTIONS = [
  { id: "summary", label: "요약" },
  { id: "probability", label: "우승·진출 확률" },
  { id: "scenario", label: "순위 시뮬레이터" },
  { id: "picks", label: "잔여 경기" },
  { id: "history", label: "주차별 추이" },
  { id: "magic", label: "매직넘버" },
  { id: "stats", label: "팀 기록" },
  { id: "matchups", label: "상대전적" },
] as const;

export function SectionNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targets = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (element): element is HTMLElement => element !== null,
    );
    if (targets.length === 0) return;

    // 화면 위쪽 띠(헤더 아래 ~ 화면 중앙)를 지나는 섹션을 현재 위치로 본다.
    // 섹션 사이 빈 구간에서는 마지막 값을 유지해 깜빡이지 않게 한다.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -55% 0px", threshold: 0 },
    );

    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // 좁은 화면에서는 가로로 스크롤되므로 현재 항목을 보이는 곳으로 끌어온다.
  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!list || !current) return;
    const overflowsLeft = current.offsetLeft < list.scrollLeft;
    const overflowsRight =
      current.offsetLeft + current.offsetWidth > list.scrollLeft + list.clientWidth;
    if (overflowsLeft || overflowsRight) {
      list.scrollTo({
        left: current.offsetLeft - list.clientWidth / 2 + current.offsetWidth / 2,
        behavior: "smooth",
      });
    }
  }, [active]);

  return (
    <nav className="section-nav" aria-label="데이터 바로가기">
      <div className="section-nav-list" ref={listRef}>
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            data-id={section.id}
            aria-current={active === section.id ? "true" : undefined}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
