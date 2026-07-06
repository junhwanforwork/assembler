import { BrandSpark } from "@/components/ui/motion/BrandSpark"
import s from "./dashboard.module.css"

// 검색은 미구현 — 구현 전엔 버튼을 노출하지 않는다(거짓 표면 0).
// 아바타도 auth 배선 전까지 같은 규칙(가짜 로그인 신호 금지, X-14).
export function TopBar() {
  return (
    <header className={s.topbar}>
      <div className={s.logo}>
        <BrandSpark />
        <span className={s.logoWord}>Assembler</span>
      </div>
    </header>
  )
}
