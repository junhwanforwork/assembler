"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, TextArea, type SelectOption } from "@/components/ui";
import { COLOR } from "@/lib/design-tokens";

export interface RefOption {
  id: string;
  name: string;
}

const DEVICE_OPTIONS: SelectOption[] = [
  { value: "", label: "선택 안 함" },
  { value: "mobile_app", label: "📱 모바일 앱" },
  { value: "web", label: "🌐 웹" },
  { value: "kiosk", label: "🖥️ 키오스크" },
  { value: "tablet_pos", label: "📟 태블릿 POS" },
  { value: "dashboard", label: "📊 대시보드" },
];

const FEATURE_AREAS_PLACEHOLDER = `[
  {
    "name": "적립 화면",
    "decisions": [
      {
        "element": "QR 코드 표시 방식",
        "chosen": "전체 화면 흰 배경",
        "why": "시야에 잘 들어와 스캔 성공률이 높아요",
        "advantage": "재시도가 거의 없어요"
      }
    ]
  }
]`;

const FEATURES_PLACEHOLDER = `[
  {
    "id": 1,
    "spec": "현재 위치 기반으로 가까운 매장을 선택할 수 있다",
    "ui": "상단 드롭다운 + 지도 모달",
    "states": ["기본", "위치권한 거부", "매장 검색 중", "매장 없음"]
  }
]`;

const ERROR_MESSAGES: Record<string, string> = {
  product_required: "상품을 선택해 주세요.",
  headline_required: "헤드라인을 입력해 주세요.",
  invalid_device_type: "기기 종류가 올바르지 않아요.",
  invalid_feature_areas: "feature_areas는 배열 형식이어야 해요.",
  invalid_features: "features는 배열 형식이어야 해요.",
  invalid_setup_guide: "setup_guide는 배열 형식이어야 해요.",
  unauthorized: "로그인이 풀렸어요. 새로고침 후 다시 시도해 주세요.",
};

function toLines(value: string): string[] {
  return value.split("\n").map((s) => s.trim()).filter(Boolean);
}
function toTags(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

const EMPTY = {
  product_id: "",
  headline: "",
  feature_type_id: "",
  industry_id: "",
  device_type: "",
  feature_areas: "",
  features: "",
  plain_notes: "",
  pros: "",
  cons: "",
  best_for: "",
  setup_guide: "",
  tags: "",
  is_published: false,
};

interface ImplFormProps {
  products: RefOption[];
  featureTypes: RefOption[];
  industries: RefOption[];
}

export default function ImplForm({ products, featureTypes, industries }: ImplFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    // JSON 필드는 보내기 전에 파싱해서 형식 오류를 미리 잡는다
    let featureAreas: unknown = [];
    if (form.feature_areas.trim()) {
      try {
        featureAreas = JSON.parse(form.feature_areas);
      } catch {
        setError("feature_areas JSON 형식을 확인해 주세요.");
        return;
      }
    }
    let features: unknown = [];
    if (form.features.trim()) {
      try {
        features = JSON.parse(form.features);
      } catch {
        setError("features JSON 형식을 확인해 주세요.");
        return;
      }
    }
    let setupGuide: unknown = null;
    if (form.setup_guide.trim()) {
      try {
        setupGuide = JSON.parse(form.setup_guide);
      } catch {
        setError("setup_guide JSON 형식을 확인해 주세요.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/implementations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: form.product_id,
          headline: form.headline,
          feature_type_id: form.feature_type_id,
          industry_id: form.industry_id,
          device_type: form.device_type,
          feature_areas: featureAreas,
          features: features,
          plain_notes: form.plain_notes,
          pros: toLines(form.pros),
          cons: toLines(form.cons),
          best_for: form.best_for,
          setup_guide: setupGuide,
          tags: toTags(form.tags),
          is_published: form.is_published,
        }),
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(ERROR_MESSAGES[data.error ?? ""] ?? "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.");
    } catch {
      setError("네트워크 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  const productOptions: SelectOption[] = [
    { value: "", label: "선택해 주세요" },
    ...products.map((p) => ({ value: p.id, label: p.name })),
  ];
  const featureOptions: SelectOption[] = [
    { value: "", label: "선택 안 함" },
    ...featureTypes.map((f) => ({ value: f.id, label: f.name })),
  ];
  const industryOptions: SelectOption[] = [
    { value: "", label: "선택 안 함" },
    ...industries.map((i) => ({ value: i.id, label: i.name })),
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-xl">
      <Select
        label="상품"
        required
        value={form.product_id}
        onChange={(v) => set("product_id", v)}
        options={productOptions}
      />

      <Input
        label="헤드라인"
        hint="이 구현을 한 줄로"
        required
        value={form.headline}
        onChange={(e) => set("headline", e.target.value)}
        placeholder="QR 스캔으로 자동 적립"
      />

      <Select
        label="기능 유형"
        value={form.feature_type_id}
        onChange={(v) => set("feature_type_id", v)}
        options={featureOptions}
      />

      <Select
        label="업종"
        value={form.industry_id}
        onChange={(v) => set("industry_id", v)}
        options={industryOptions}
      />

      <Select
        label="기기 종류"
        value={form.device_type}
        onChange={(v) => set("device_type", v)}
        options={DEVICE_OPTIONS}
      />

      <TextArea
        label="feature_areas (JSON)"
        hint="구현 결정 묶음. 배열 형식"
        monospace
        value={form.feature_areas}
        onChange={(e) => set("feature_areas", e.target.value)}
        placeholder={FEATURE_AREAS_PLACEHOLDER}
        style={{ minHeight: 200 }}
      />

      <TextArea
        label="기능 명세 features (JSON)"
        hint="이 서비스가 가진 기능 목록. 표로 노출됨. 배열 형식"
        monospace
        value={form.features}
        onChange={(e) => set("features", e.target.value)}
        placeholder={FEATURES_PLACEHOLDER}
        style={{ minHeight: 180 }}
      />

      <TextArea
        label="장점"
        hint="한 줄에 하나씩"
        value={form.pros}
        onChange={(e) => set("pros", e.target.value)}
      />

      <TextArea
        label="단점"
        hint="한 줄에 하나씩"
        value={form.cons}
        onChange={(e) => set("cons", e.target.value)}
      />

      <Input
        label="이런 곳에 좋아요 (best_for)"
        value={form.best_for}
        onChange={(e) => set("best_for", e.target.value)}
      />

      <TextArea
        label="쉬운 설명 (plain_notes)"
        value={form.plain_notes}
        onChange={(e) => set("plain_notes", e.target.value)}
      />

      <TextArea
        label="setup_guide (JSON)"
        hint="비워도 돼요. 배열 형식"
        monospace
        value={form.setup_guide}
        onChange={(e) => set("setup_guide", e.target.value)}
        style={{ minHeight: 120 }}
      />

      <Input
        label="태그"
        hint="콤마로 구분"
        value={form.tags}
        onChange={(e) => set("tags", e.target.value)}
        placeholder="적립, QR, 자동화"
      />

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.is_published}
          onChange={(e) => set("is_published", e.target.checked)}
          style={{ accentColor: COLOR.ACCENT, width: 16, height: 16 }}
        />
        <span className="text-sm" style={{ color: COLOR.TEXT_SECONDARY }}>
          바로 발행하기 (기본은 미발행 — 검수 후 발행)
        </span>
      </label>

      {error && (
        <p className="text-sm" style={{ color: COLOR.NEGATIVE }}>
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button variant="solid" size="md" type="submit" loading={saving}>
          구현 추가하기
        </Button>
        <Button variant="neutral" size="md" onClick={() => router.push("/admin")}>
          닫기
        </Button>
      </div>
    </form>
  );
}
