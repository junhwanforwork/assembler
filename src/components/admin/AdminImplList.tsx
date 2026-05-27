"use client";
import { useState } from "react";
import Link from "next/link";
import { ImplWithProduct } from "@/types";
import { Button } from "@/components/ui";
import { COLOR, RADIUS } from "@/lib/design-tokens";

interface AdminImplListProps {
  unpublished: ImplWithProduct[];
  published: ImplWithProduct[];
}

export default function AdminImplList({
  unpublished: initialUnpublished,
  published: initialPublished,
}: AdminImplListProps) {
  const [tab, setTab] = useState<"unpublished" | "published">("unpublished");
  const [unpublished, setUnpublished] = useState(initialUnpublished);
  const [published, setPublished] = useState(initialPublished);
  const [publishing, setPublishing] = useState<string | null>(null);

  async function handlePublish(id: string) {
    setPublishing(id);
    try {
      const res = await fetch(`/api/admin/implementations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: true }),
      });
      if (res.ok) {
        const item = unpublished.find((i) => i.id === id);
        if (item) {
          setUnpublished((prev) => prev.filter((i) => i.id !== id));
          setPublished((prev) => [{ ...item, is_published: true }, ...prev]);
        }
      }
    } finally {
      setPublishing(null);
    }
  }

  const items = tab === "unpublished" ? unpublished : published;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: COLOR.TEXT_PRIMARY }}>
            어드민
          </h1>
          <p className="text-sm mt-1" style={{ color: COLOR.TEXT_SECONDARY }}>
            구현 콘텐츠를 검수하고 발행해요
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/admin/products/new" passHref legacyBehavior>
            <a>
              <Button variant="neutral" size="md">+ 상품 추가</Button>
            </a>
          </Link>
          <Link href="/admin/impl/new" passHref legacyBehavior>
            <a>
              <Button variant="solid" size="md">+ 구현 추가</Button>
            </a>
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex mb-6" style={{ borderBottom: `1px solid ${COLOR.BORDER_SUBTLE}` }}>
        {(["unpublished", "published"] as const).map((t) => {
          const active = tab === t;
          const label = t === "unpublished" ? "미발행" : "발행됨";
          const count = t === "unpublished" ? unpublished.length : published.length;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="px-4 py-3 text-sm font-medium transition-colors outline-none"
              style={{
                color: active ? COLOR.TEXT_PRIMARY : COLOR.TEXT_SECONDARY,
                borderBottom: `2px solid ${active ? COLOR.ACCENT : "transparent"}`,
                marginBottom: -1,
              }}
            >
              {label} {count}
            </button>
          );
        })}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <p className="text-sm" style={{ color: COLOR.TEXT_MUTED }}>
          {tab === "unpublished" ? "미발행 콘텐츠가 없어요" : "발행된 콘텐츠가 없어요"}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((impl) => (
            <div
              key={impl.id}
              className="flex items-center gap-4 px-5 py-4"
              style={{
                background: COLOR.BG_CARD,
                border: `1px solid ${COLOR.BORDER_SUBTLE}`,
                borderRadius: RADIUS.LG,
              }}
            >
              {/* Brand color dot */}
              <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{
                  background: impl.product?.brand_color ?? COLOR.BG_ELEVATED,
                  color: COLOR.TEXT_INVERSE,
                  borderRadius: RADIUS.SM,
                }}
              >
                {impl.product?.name?.[0] ?? "?"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: COLOR.TEXT_PRIMARY }}>
                  {impl.headline}
                </p>
                <p className="text-xs mt-0.5" style={{ color: COLOR.TEXT_MUTED }}>
                  {impl.product?.name} · {impl.feature_type?.name ?? "기능 없음"} · {impl.device_type ?? "기기 없음"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/impl/${impl.id}`}
                  className="text-xs px-3 py-1.5"
                  style={{
                    background: COLOR.BG_ELEVATED,
                    color: COLOR.TEXT_SECONDARY,
                    borderRadius: RADIUS.MD,
                  }}
                >
                  미리보기
                </Link>
                {tab === "unpublished" && (
                  <Button
                    variant="solid"
                    size="sm"
                    loading={publishing === impl.id}
                    onClick={() => handlePublish(impl.id)}
                  >
                    퍼블리시하기
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
