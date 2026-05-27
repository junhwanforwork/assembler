"use client";
import { useState, FormEvent } from "react";
import { Button, Input } from "@/components/ui";
import { COLOR } from "@/lib/design-tokens";

export default function AdminAuthGate() {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      setError("비밀번호가 맞지 않아요");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: COLOR.BG_BASE }}>
      <form onSubmit={handleSubmit} className="w-80 flex flex-col gap-4">
        <h1 className="text-xl font-bold" style={{ color: COLOR.TEXT_PRIMARY }}>
          어드민
        </h1>
        <Input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="비밀번호"
          aria-label="비밀번호"
          error={error}
        />
        <Button variant="solid" size="md" type="submit" loading={loading} className="w-full">
          로그인하기
        </Button>
      </form>
    </div>
  );
}
