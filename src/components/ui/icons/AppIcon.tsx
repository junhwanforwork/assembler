import { type FC, type ReactNode } from "react";
import { COLOR, RADIUS } from "@/lib/design-tokens";

const DARK_BG = "#1a1a1f";

interface AppIconProps {
  size?: number;
  variant?: "light" | "dark";
  iconColor?: string;
  children: ReactNode;
  className?: string;
}

export const AppIcon: FC<AppIconProps> = ({
  size = 48,
  variant = "light",
  iconColor = COLOR.ACCENT,
  children,
  className = "",
}) => {
  const bg = variant === "dark" ? DARK_BG : COLOR.BG_SECTION;
  const radius = size >= 56 ? RADIUS["2XL"] : size >= 40 ? RADIUS.XL : RADIUS.LG;

  return (
    <div
      className={`app_icon_wrap inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg,
        color: iconColor,
      }}
    >
      <div
        style={{
          width: "60%",
          height: "60%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
};
