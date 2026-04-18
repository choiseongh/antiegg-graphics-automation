"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { EditArticle } from "@/lib/types"

interface SortableCardProps {
  article: EditArticle
}

export function SortableCard({ article }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${article.type}-${article.no}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const unmatched = article.slackOrderMatched === false
  const borderClass = isDragging
    ? "border-zinc-400 shadow-lg z-10 dark:border-zinc-500"
    : unmatched
      ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40"
      : "border-zinc-200 dark:border-zinc-800"

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${isDragging || !unmatched ? "bg-white dark:bg-zinc-900" : ""} ${borderClass}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
        title="드래그하여 순서 변경"
      >
        &#x2261;
      </button>

      <span className="w-6 text-center text-sm font-bold text-zinc-500">
        {article.order}
      </span>

      {unmatched && (
        <span
          className="shrink-0 rounded-md bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-800 dark:text-amber-100"
          title="Slack 아티클 순서와 매칭되지 않았습니다. 제목을 확인하거나 수동으로 재정렬해주세요."
        >
          매칭 실패
        </span>
      )}

      <span className="flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {article.title}
      </span>

      <span className="shrink-0 text-xs text-zinc-500">
        {article.editor} &middot; {article.introCharCount}자
      </span>
    </div>
  )
}
