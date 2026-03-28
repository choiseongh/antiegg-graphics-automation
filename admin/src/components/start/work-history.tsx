"use client"

import type { WorkHistoryEntry } from "@/lib/types"

interface WorkHistoryProps {
  entries: WorkHistoryEntry[]
  onSelect: (issue: number) => void
}

export function WorkHistory({ entries, onSelect }: WorkHistoryProps) {
  if (entries.length === 0) return null

  return (
    <div className="mt-10 w-full max-w-md">
      <h2 className="mb-3 text-sm font-medium text-zinc-500">최근 작업</h2>
      <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {entries.map((e) => (
          <button
            key={e.issue}
            onClick={() => onSelect(e.issue)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {e.issue}호
            </span>
            <span className="text-zinc-500">
              {e.date} &middot; {e.articleCount}개 아티클
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
