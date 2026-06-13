"use client";

import { memo, useState, type FC, type CSSProperties } from "react";
import { COLOR, RADIUS, SPACING, TYPOGRAPHY, SHADOW, DURATION, EASE } from "@/lib/design-tokens";
import type { ProjectListItem } from "@/lib/types/builder";

// 메타 요약 카드 — Assembler 프로젝트는 객체 그래프라 스크린샷 썸네일이 없다.
// 제목 + 그래프 규모 + 수정일을 보여준다. (Feature/Page 카운트는 ProjectGraph 착지 후 확장.)

interface ProjectCardProps {
  item: ProjectListItem;
  onOpen: () => void;
  onDelete: () => void;
}

function relativeTime(iso: string): string {
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const hr = Math.floor(diffMin / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}개월 전`;
  return `${Math.floor(mon / 12)}년 전`;
}

const ProjectCardImpl: FC<ProjectCardProps> = ({ item, onOpen, onDelete }) => {
  const [hovered, setHovered] = useState(false);

  const cardStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: SPACING["3"],
    padding: SPACING["4"],
    minHeight: "132px",
    borderRadius: RADIUS.LG,
    border: `1px solid ${COLOR.BORDER_DEFAULT}`,
    backgroundColor: COLOR.BG_SURFACE,
    boxShadow: hovered ? SHADOW.CARD_HOVER : SHADOW.CARD,
    transition: `box-shadow ${DURATION.BASE} ${EASE.DEFAULT}`,
  };

  return (
    <div
      className="dash_project_card"
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button type="button" onClick={onOpen} style={CARD_BODY_STYLE} aria-label={`${item.title} 열기`}>
        <span aria-hidden="true" style={GLYPH_STYLE}>
          ◆
        </span>
        <span style={{ ...TYPOGRAPHY.STYLE.TITLE_1, color: COLOR.TEXT_PRIMARY, marginTop: "auto" }}>
          {item.title}
        </span>
        <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }}>
          화면 {item.screenCount}개 · {relativeTime(item.updatedAt)} 수정
        </span>
      </button>

      {/* 즐겨찾기 — v1 stub(시각만). 실제 토글은 Phase 9. */}
      <span aria-hidden="true" style={STAR_STYLE} title="즐겨찾기는 곧 추가돼요">
        ☆
      </span>

      {/* 삭제 — hover 시 노출 */}
      <button
        type="button"
        aria-label="프로젝트 삭제"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{ ...DELETE_STYLE, opacity: hovered ? 1 : 0 }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};

export const ProjectCard = memo(ProjectCardImpl);

const CARD_BODY_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["1"],
  alignItems: "flex-start",
  textAlign: "left",
  flex: 1,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
};

const GLYPH_STYLE: CSSProperties = {
  fontSize: "18px",
  color: COLOR.ACCENT,
  lineHeight: 1,
};

const STAR_STYLE: CSSProperties = {
  position: "absolute",
  top: SPACING["3"],
  right: SPACING["3"],
  fontSize: "14px",
  color: COLOR.TEXT_MUTED,
  pointerEvents: "none",
};

const DELETE_STYLE: CSSProperties = {
  position: "absolute",
  bottom: SPACING["3"],
  right: SPACING["3"],
  width: "26px",
  height: "26px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: RADIUS.SM,
  border: "none",
  background: "transparent",
  color: COLOR.TEXT_MUTED,
  cursor: "pointer",
  transition: `opacity ${DURATION.FAST} ${EASE.DEFAULT}`,
};
