import type { Metadata } from "next";
import { type ReactNode } from "react";
import { Poppins } from "next/font/google";
import "./globals.css";

// Poppins handles Latin (English + numbers).
// Wanted Sans handles Korean glyphs — loaded via CDN in <head>.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Assembler",
  description: "조립식 UX 명세 + 와이어프레임 빌더",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={poppins.variable} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/WantedSans.min.css"
        />
        {/* FOUC 방지: 렌더 전에 data-theme 설정 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('assembler-theme');var stored=s?JSON.parse(s).state?.theme:null;var t;if(stored==='dark'||stored==='light'){t=stored;}else{t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
