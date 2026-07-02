import { SearchIcon } from "@/components/ui/icons"
import { IconButton } from "@/components/ui/Button"
import { Avatar } from "@/components/ui/Avatar"
import { BrandSpark } from "@/components/ui/motion/BrandSpark"
import s from "./dashboard.module.css"

export function TopBar() {
  return (
    <header className={s.topbar}>
      <div className={s.logo}>
        <BrandSpark />
        <span className={s.logoWord}>Assembler</span>
      </div>
      <div className={s.topbarRight}>
        <IconButton label="검색">
          <SearchIcon />
        </IconButton>
        <Avatar initial="J" />
      </div>
    </header>
  )
}
