"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, TextArea, type SelectOption } from "@/components/ui";
import { COLOR } from "@/lib/design-tokens";

export interface IndustryOption {
  id: string;
  name: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  name_required: "이름을 입력해 주세요.",
  slug_required: "slug를 입력해 주세요.",
  invalid_slug: "slug는 영문 소문자·숫자·하이픈만 쓸 수 있어요.",
  invalid_color: "브랜드 색상은 #RRGGBB 형식으로 입력해 주세요.",
  slug_taken: "이미 쓰고 있는 slug예요. 다른 값으로 바꿔 주세요.",
  unauthorized: "로그인이 풀렸어요. 새로고침 후 다시 시도해 주세요.",
};

function toSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
}

const EMPTY = {
  name: "",
  slug: "",
  brand_color: "",
  logo_url: "",
  industry_id: "",
  website_url: "",
  description: "",
  is_published: true,
};

export default function ProductForm({ industries }: { industries: IndustryOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // 이름 입력 후 slug 비어있으면 자동 생성
  function handleNameBlur() {
    if (!form.slug.trim() && form.name.trim()) set("slug", toSlug(form.name));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  const industryOptions: SelectOption[] = [
    { value: "", label: "선택 안 함" },
    ...industries.map((i) => ({ value: i.id, label: i.name })),
  ];

  const validHex = /^#[0-9a-fA-F]{6}$/.test(form.brand_color);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-xl">
      <Input
        label="이름"
        required
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        onBlur={handleNameBlur}
        placeholder="스타벅스"
      />

      <Input
        label="slug"
        hint="URL·식별자. 영문 소문자·숫자·하이픈"
        required
        value={form.slug}
        onChange={(e) => set("slug", e.target.value)}
        placeholder="starbucks"
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium" style={{ color: COLOR.TEXT_PRIMARY }}>
          브랜드 색상
        </span>
        <span className="text-xs" style={{ color: COLOR.TEXT_MUTED }}>
          카드 배경에 쓰여요. #RRGGBB
        </span>
        <div className="flex items-stretch gap-2.5">
          <div className="flex-1">
            <Input
              value={form.brand_color}
              onChange={(e) => set("brand_color", e.target.value)}
              placeholder="#00704A"
              aria-label="브랜드 색상"
            />
          </div>
          <span
            aria-hidden="true"
            className="flex-shrink-0"
            style={{
              width: 40,
              borderRadius: 12,
              background: validHex ? form.brand_color : COLOR.BG_ELEVATED,
              border: `1px solid ${COLOR.BORDER_DEFAULT}`,
            }}
          />
        </div>
      </div>

      <Input
        label="로고 URL"
        value={form.logo_url}
        onChange={(e) => set("logo_url", e.target.value)}
        placeholder="https://..."
      />

      <Select
        label="업종"
        value={form.industry_id}
        onChange={(v) => set("industry_id", v)}
        options={industryOptions}
      />

      <Input
        label="웹사이트 URL"
        value={form.website_url}
        onChange={(e) => set("website_url", e.target.value)}
        placeholder="https://..."
      />

      <TextArea
        label="설명"
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
      />

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.is_published}
          onChange={(e) => set("is_published", e.target.checked)}
          style={{ accentColor: COLOR.ACCENT, width: 16, height: 16 }}
        />
        <span className="text-sm" style={{ color: COLOR.TEXT_SECONDARY }}>
          바로 발행하기
        </span>
      </label>

      {error && (
        <p className="text-sm" style={{ color: COLOR.NEGATIVE }}>
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button variant="solid" size="md" type="submit" loading={saving}>
          상품 추가하기
        </Button>
        <Button variant="neutral" size="md" onClick={() => router.push("/admin")}>
          닫기
        </Button>
      </div>
    </form>
  );
}
