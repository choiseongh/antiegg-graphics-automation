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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-white px-4 py-3 dark:bg-zinc-900 ${
        isDragging
          ? "border-zinc-400 shadow-lg z-10 dark:border-zinc-500"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
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

      <span className="flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {article.title}
      </span>

      <span className="shrink-0 text-xs text-zinc-500">
        {article.editor} &middot; {article.introCharCount}자
      </span>
    </div>
  )
}
