import Link from "next/link";
import { COLOR, TYPOGRAPHY, RADIUS } from "@/lib/design-tokens";

export type SurveyErrorType =
  | "not_found"
  | "not_published"
  | "closed"
  | "already_responded"
  | "forbidden"
  | "server_error"
  | "token_invalid"
  | "token_expired"
  | "token_limit_reached";

interface SurveyErrorScreenProps {
  type: SurveyErrorType;
  surveyId?: string;
}

const CONFIG: Record<
  SurveyErrorType,
  {
    title: string;
    description: string;
    cta: "home" | "result_and_participate" | "participate" | "none";
  }
> = {
  not_found: {
    title: "설문을 찾을 수 없어요",
    description: "삭제됐거나 잘못된 주소예요.",
    cta: "home",
  },
  not_published: {
    title: "참여할 수 없는 설문이에요",
    description: "아직 공개되지 않았거나 마감됐어요.",
    cta: "participate",
  },
  closed: {
    title: "마감된 설문이에요",
    description: "참여 인원이 모두 찼어요.",
    cta: "participate",
  },
  already_responded: {
    title: "이미 참여한 설문이에요",
    description: "결과를 확인해 보세요.",
    cta: "result_and_participate",
  },
  forbidden: {
    title: "접근 권한이 없어요",
    description: "이 설문의 창작자만 볼 수 있어요.",
    cta: "home",
  },
  server_error: {
    title: "일시적인 오류가 생겼어요",
    description: "잠시 후 다시 시도해 주세요.",
    cta: "home",
  },
  token_invalid: {
    title: "유효하지 않은 링크예요",
    description: "링크가 잘못됐거나 삭제됐어요.",
    cta: "home",
  },
  token_expired: {
    title: "만료된 링크예요",
    description: "이 공유 링크는 사용 기간이 끝났어요.",
    cta: "home",
  },
  token_limit_reached: {
    title: "마감된 링크예요",
    description: "이 링크로 참여할 수 있는 인원이 모두 찼어요.",
    cta: "participate",
  },
};

function Icon({ type }: { type: SurveyErrorType }) {
  const s = { stroke: COLOR.TEXT_MUTED, strokeWidth: 1.5, strokeLinecap: "round" as const };

  if (type === "already_responded") {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="14" stroke={COLOR.TEXT_MUTED} strokeWidth={1.5} />
        <path d="M10 16l4 4 8-8" {...s} strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "closed" || type === "token_limit_reached") {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect
          x="7"
          y="15"
          width="18"
          height="12"
          rx="2"
          stroke={COLOR.TEXT_MUTED}
          strokeWidth={1.5}
        />
        <path d="M11 15v-4a5 5 0 0 1 10 0v4" {...s} />
      </svg>
    );
  }

  if (type === "not_published") {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M4 16s4-8 12-8 12 8 12 8-4 8-12 8" {...s} />
        <circle cx="16" cy="16" r="4" stroke={COLOR.TEXT_MUTED} strokeWidth={1.5} />
        <path d="M5 5l22 22" {...s} />
      </svg>
    );
  }

  if (type === "server_error") {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="14" stroke={COLOR.TEXT_MUTED} strokeWidth={1.5} />
        <path d="M16 10v8" {...s} />
        <circle cx="16" cy="22" r="1.25" fill={COLOR.TEXT_MUTED} />
      </svg>
    );
  }

  // not_found, forbidden, token_invalid, token_expired — 물음표
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke={COLOR.TEXT_MUTED} strokeWidth={1.5} />
      <path d="M13 12.5a3 3 0 0 1 5.83 1c0 2-3 3-3 5" {...s} />
      <circle cx="16" cy="22.5" r="1.25" fill={COLOR.TEXT_MUTED} />
    </svg>
  );
}

export function SurveyErrorScreen({ type, surveyId }: SurveyErrorScreenProps) {
  const { title, description, cta } = CONFIG[type];

  return (
    <main
      className="survey_error_wrap"
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      <div
        className="survey_error_card"
        style={{
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
          border: `1px solid ${COLOR.BORDER_DEFAULT}`,
          borderRadius: RADIUS.XL,
          padding: "48px 32px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <Icon type={type} />
        </div>

        <p style={{ ...TYPOGRAPHY.STYLE.TITLE_2_KO, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
          {title}
        </p>

        <p
          style={{
            ...TYPOGRAPHY.STYLE.BODY_2,
            color: COLOR.TEXT_MUTED,
            margin: "8px 0 0",
          }}
        >
          {description}
        </p>

        {cta === "result_and_participate" ? (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {surveyId && (
              <Link
                href={`/survey/${surveyId}/report`}
                style={{
                  display: "block",
                  padding: "12px 0",
                  borderRadius: RADIUS.LG,
                  backgroundColor: COLOR.ACCENT,
                  color: "#ffffff",
                  ...TYPOGRAPHY.STYLE.LABEL_1,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                결과 보기
              </Link>
            )}
            <Link
              href="/"
              style={{
                display: "block",
                padding: "12px 0",
                borderRadius: RADIUS.LG,
                backgroundColor: "transparent",
                color: COLOR.TEXT_MUTED,
                ...TYPOGRAPHY.STYLE.LABEL_1,
                textDecoration: "none",
              }}
            >
              다른 설문 참여하기
            </Link>
          </div>
        ) : cta === "participate" ? (
          <div style={{ marginTop: 24 }}>
            <Link
              href="/"
              style={{
                display: "block",
                padding: "12px 0",
                borderRadius: RADIUS.LG,
                backgroundColor: COLOR.ACCENT,
                color: "#ffffff",
                ...TYPOGRAPHY.STYLE.LABEL_1,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              다른 설문 참여하기
            </Link>
          </div>
        ) : cta === "home" ? (
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginTop: 24,
              ...TYPOGRAPHY.STYLE.LABEL_1,
              color: COLOR.ACCENT,
              textDecoration: "none",
            }}
          >
            홈으로 가기
          </Link>
        ) : null}
      </div>
    </main>
  );
}
