"use client";

import type { FeatureSpec } from "@/types";
import { COLOR, RADIUS } from "@/lib/design-tokens";
import FeatureSpecTable from "./FeatureSpecTable";
import FeatureSpecCardList from "./FeatureSpecCardList";

interface FeatureSpecSectionProps {
  features: FeatureSpec[];
  loading?: boolean;
}

/**
 * `/impl/[id]` 헤더 아래 별도 섹션.
 * 데스크탑 ≥ 768px: <FeatureSpecTable>
 * 모바일  < 768px: <FeatureSpecCardList>
 * loading=true → 스켈레톤 (현재 SSR이라 사용처 없지만 명세 + 미래 client fetch 대비)
 * features=[] → 빈 상태 카드
 */
export default function FeatureSpecSection({ features, loading = false }: FeatureSpecSectionProps) {
  return (
    <section className="feature_spec_section" style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: COLOR.TEXT_PRIMARY,
          marginBottom: 12,
        }}
      >
        기능 명세
      </h2>

      {loading ? (
        <SkeletonRows />
      ) : features.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="hidden md:block">
            <FeatureSpecTable features={features} />
          </div>
          <div className="block md:hidden">
            <FeatureSpecCardList features={features} />
          </div>
        </>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        background: COLOR.BG_SURFACE,
        border: `1px solid ${COLOR.BORDER_SUBTLE}`,
        borderRadius: RADIUS.MD,
        padding: "24px 16px",
        textAlign: "center",
        color: COLOR.TEXT_MUTED,
        fontSize: 13,
      }}
    >
      아직 등록된 기능이 없어요
    </div>
  );
}

function SkeletonRows() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: COLOR.BG_SURFACE,
        border: `1px solid ${COLOR.BORDER_SUBTLE}`,
        borderRadius: RADIUS.MD,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 36,
          background: COLOR.BG_CARD,
          borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
        }}
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 56,
            borderBottom: i < 2 ? `1px solid ${COLOR.BORDER_SUBTLE}` : "none",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 16,
          }}
        >
          <SkelBlock width={32} />
          <SkelBlock width={220} />
          <SkelBlock width={140} />
          <SkelBlock width={180} />
        </div>
      ))}
      <style>{`
        @keyframes featureSkeletonPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

function SkelBlock({ width }: { width: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width,
        height: 12,
        background: COLOR.BG_ELEVATED,
        borderRadius: 4,
        animation: "featureSkeletonPulse 1.6s ease-in-out infinite",
      }}
    />
  );
}
