'use client'
import { useSearchParams, useRouter } from 'next/navigation'

export interface Filters {
  feature_type: string | null
  industry: string | null
  device: string | null
  q: string | null
}

export function useFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const filters: Filters = {
    feature_type: searchParams.get('feature_type'),
    industry: searchParams.get('industry'),
    device: searchParams.get('device'),
    q: searchParams.get('q'),
  }

  function setFilter(key: keyof Filters, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`/?${params.toString()}`)
  }

  return { filters, setFilter }
}
