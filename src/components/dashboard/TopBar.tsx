import { SparkIcon, SearchIcon } from "@/components/ui/icons"
import { IconButton } from "@/components/ui/Button"
import { Avatar } from "@/components/ui/Avatar"
import s from "./dashboard.module.css"

export function TopBar() {
  return (
    <header className={s.topbar}>
      <div className={s.logo}>
        <SparkIcon />
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
