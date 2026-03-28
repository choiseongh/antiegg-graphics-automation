"use client"

import { useState, useCallback, useEffect } from "react"

export function useLocalStorage<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(initial)

  useEffect(() => {
    try {
      const item = localStorage.getItem(key)
      if (item) setStored(JSON.parse(item) as T)
    } catch { /* ignore */ }
  }, [key])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = typeof value === "function" ? (value as (p: T) => T)(prev) : value
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch { /* ignore */ }
        return next
      })
    },
    [key],
  )

  return [stored, setValue]
}
