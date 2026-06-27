"use client"

import { useCallback, useEffect, useState } from "react"
import { api, type Product } from "@/lib/api/client"

// 프로젝트(메인) 목록 — 탭에 쓰인다. 세션 소유의 products.
export function useProjects() {
  const [projects, setProjects] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await api.get<{ products: Product[] }>("/api/products")
      setProjects(data.products)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // 마운트 시 1회 패칭(의도된 setState) — 외부 시스템(API) 동기화.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  return { projects, loading, error, reload }
}
