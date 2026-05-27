"use client";
import { useState, useEffect, useCallback } from "react";
import { useSavedStore } from "@/stores/savedStore";
import { getSessionId } from "@/lib/session";
import { Button, Modal } from "@/components/ui";
import { COLOR, RADIUS, SHADOW } from "@/lib/design-tokens";
import type { SavedItem } from "@/types";

interface SaveButtonProps {
  implId: string;
  featureSlug?: string | null;
  featureName?: string | null;
}

export default function SaveButton({ implId, featureSlug, featureName }: SaveButtonProps) {
  const { items, setItems } = useSavedStore();
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [conflict, setConflict] = useState<SavedItem | null>(null);

  // 저장 변경 후엔 항상 다시 불러와 store 를 권위 있는 상태로 둔다 (join 된 feature_type 포함)
  const loadSaved = useCallback(() => {
    const sessionId = getSessionId();
    return fetch("/api/saved", { headers: { "x-session-id": sessionId } })
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setItems(data.data);
      })
      .catch(() => {});
  }, [setItems]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const isSaved = items.some((i) => i.implementation_id === implId);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }

  // 같은 feature_type 의 '다른' 구현이 이미 저장돼 있으면 그 항목을 돌려준다
  function findConflict(): SavedItem | null {
    if (!featureSlug) return null;
    return (
      items.find(
        (i) => i.implementation_id !== implId && i.implementation?.feature_type?.slug === featureSlug,
      ) ?? null
    );
  }

  async function postSave(sessionId: string) {
    const res = await fetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-session-id": sessionId },
      body: JSON.stringify({ implementation_id: implId }),
    });
    return res.ok;
  }

  async function deleteSaved(sessionId: string, id: string) {
    const res = await fetch(`/api/saved?id=${id}`, {
      method: "DELETE",
      headers: { "x-session-id": sessionId },
    });
    return res.ok;
  }

  async function handleClick() {
    const sessionId = getSessionId();

    if (isSaved) {
      const mine = items.find((i) => i.implementation_id === implId);
      if (!mine) return;
      setLoading(true);
      try {
        if (await deleteSaved(sessionId, mine.id)) {
          await loadSaved();
          showToast("저장을 취소했어요");
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    const c = findConflict();
    if (c) {
      setConflict(c);
      return;
    }

    setLoading(true);
    try {
      if (await postSave(sessionId)) {
        await loadSaved();
        showToast("저장했어요. 워크스페이스에서 확인해요");
      }
    } finally {
      setLoading(false);
    }
  }

  // 기존 항목을 지우고 새로 고른 구현으로 교체
  async function handleSwap() {
    if (!conflict) return;
    const sessionId = getSessionId();
    setLoading(true);
    try {
      await deleteSaved(sessionId, conflict.id);
      await postSave(sessionId);
      await loadSaved();
      setConflict(null);
      showToast("새로 고른 걸로 바꿨어요");
    } finally {
      setLoading(false);
    }
  }

  const conflictName = featureName ?? conflict?.implementation?.feature_type?.name ?? "이 기능";

  return (
    <>
      <Button
        variant={isSaved ? "solid" : "neutral"}
        size="md"
        loading={loading && !conflict}
        onClick={handleClick}
        leftIcon={<span aria-hidden="true">{isSaved ? "★" : "☆"}</span>}
      >
        {isSaved ? "저장됨" : "저장하기"}
      </Button>

      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 text-sm font-medium"
          style={{
            background: COLOR.BG_ELEVATED,
            color: COLOR.TEXT_PRIMARY,
            border: `1px solid ${COLOR.BORDER_DEFAULT}`,
            borderRadius: RADIUS.MD,
            boxShadow: SHADOW.AMBIENT,
          }}
        >
          {toastMsg}
        </div>
      )}

      <Modal
        open={!!conflict}
        onClose={() => !loading && setConflict(null)}
        dismissible={!loading}
        title="이미 비슷한 기능이 있어요"
        description={`'${conflictName}' 기능은 이미 저장했어요. 새로 고른 걸로 바꿀까요?`}
        footer={
          <>
            <Button variant="neutral" size="md" disabled={loading} onClick={() => setConflict(null)}>
              닫기
            </Button>
            <Button variant="solid" size="md" loading={loading} onClick={handleSwap}>
              바꾸기
            </Button>
          </>
        }
      />
    </>
  );
}
