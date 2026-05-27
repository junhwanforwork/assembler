'use client'
import { useState, useEffect, useRef } from 'react'
import { useFilters } from './useFilters'

export function useSearch() {
  const { filters, setFilter } = useFilters()
  const [value, setValue] = useState(filters.q ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onChange(v: string) {
    setValue(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setFilter('q', v || null), 300)
  }

  return { value, onChange }
}
