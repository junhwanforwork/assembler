import { create } from 'zustand'
import { SavedItem } from '@/types'

interface SavedStore {
  items: SavedItem[]
  setItems: (items: SavedItem[]) => void
  addItem: (item: SavedItem) => void
  removeItem: (id: string) => void
}

export const useSavedStore = create<SavedStore>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),
}))
