"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "kbo-theme";
const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "밝게", icon: "☀" },
  { value: "dark", label: "어둡게", icon: "☾" },
  { value: "system", label: "시스템", icon: "◐" },
];

/**
 * 선택한 테마는 localStorage에만 있고 서버는 알 수 없다. useSyncExternalStore를
 * 쓰면 서버는 항상 "system"으로 그리고, 하이드레이션 직후 실제 값으로 맞춰진다.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function applyTheme(next: Theme) {
  try {
    if (next === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // 저장이 막혀 있어도 이번 방문 동안은 테마가 적용되게 둔다.
  }
  if (next === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", next);
  for (const listener of [...listeners]) listener();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  return (
    <span className="segmented theme-toggle" role="group" aria-label="화면 테마">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={theme === option.value}
          onClick={() => applyTheme(option.value)}
          title={option.label}
        >
          <span aria-hidden="true">{option.icon}</span>
          <span className="visually-hidden">{option.label}</span>
        </button>
      ))}
    </span>
  );
}
