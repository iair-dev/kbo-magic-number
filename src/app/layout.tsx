import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KBO 매직넘버 | 가을야구 레이스",
  description:
    "KBO 잔여 경기로 매직넘버·트래직넘버와 가을야구 진출 확률을 계산하고, 최종 순위를 직접 시뮬레이션합니다.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2ed" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1014" },
  ],
};

/** 첫 페인트 전에 테마를 확정해 화면이 번쩍이지 않게 한다. */
const themeScript = `(function(){try{var t=localStorage.getItem("kbo-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
