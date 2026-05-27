"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Select, type SelectOption } from "@/components/ui";
import { COLOR } from "@/lib/design-tokens";

const INDUSTRY_OPTIONS: SelectOption[] = [
  { value: "", label: "업종 전체" },
  { value: "cafe", label: "☕ 카페" },
  { value: "gym", label: "💪 헬스장" },
  { value: "salon", label: "✂️ 미용실" },
  { value: "restaurant", label: "🍽️ 식당" },
];

const DEVICE_OPTIONS: SelectOption[] = [
  { value: "", label: "기기 전체" },
  { value: "mobile_app", label: "📱 모바일 앱" },
  { value: "web", label: "🌐 웹" },
  { value: "kiosk", label: "🖥️ 키오스크" },
  { value: "tablet_pos", label: "📟 태블릿 POS" },
  { value: "dashboard", label: "📊 대시보드" },
];

interface FilterBarProps {
  total?: number;
}

export default function FilterBar({ total = 0 }: FilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const saved = localStorage.getItem("hc_view");
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`/?${params.toString()}`);
  }

  function toggleView(v: "grid" | "list") {
    setView(v);
    localStorage.setItem("hc_view", v);
  }

  const industry = searchParams.get("industry") ?? "";
  const device = searchParams.get("device") ?? "";

  return (
    <div className="flex items-center gap-3 mb-5 flex-wrap">
      <div style={{ minWidth: 140 }}>
        <Select
          size="sm"
          aria-label="업종 필터"
          value={industry}
          onChange={(v) => setParam("industry", v)}
          options={INDUSTRY_OPTIONS}
        />
      </div>
      <div style={{ minWidth: 160 }}>
        <Select
          size="sm"
          aria-label="기기 필터"
          value={device}
          onChange={(v) => setParam("device", v)}
          options={DEVICE_OPTIONS}
        />
      </div>

      <span className="text-sm ml-1" style={{ color: COLOR.TEXT_MUTED }}>
        총 {total}개
      </span>

      <div className="ml-auto flex gap-1">
        {(["grid", "list"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggleView(v)}
            aria-label={v === "grid" ? "그리드 뷰" : "리스트 뷰"}
            aria-pressed={view === v}
            className="w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors"
            style={{
              background: view === v ? COLOR.BG_ELEVATED : "transparent",
              color: view === v ? COLOR.TEXT_PRIMARY : COLOR.TEXT_MUTED,
              border: view === v ? `1px solid ${COLOR.BORDER_DEFAULT}` : "1px solid transparent",
            }}
          >
            {v === "grid" ? "⊞" : "≡"}
          </button>
        ))}
      </div>
    </div>
  );
}
