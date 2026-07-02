import { Avatar } from "@/components/ui/Avatar"
import { BrandSpark } from "@/components/ui/motion/BrandSpark"
import s from "./dashboard.module.css"

// 검색은 미구현 — 구현 전엔 버튼을 노출하지 않는다(거짓 표면 0).
export function TopBar() {
  return (
    <header className={s.topbar}>
      <div className={s.logo}>
        <BrandSpark />
        <span className={s.logoWord}>Assembler</span>
      </div>
      <div className={s.topbarRight}>
        <Avatar initial="J" />
      </div>
    </header>
  )
}
