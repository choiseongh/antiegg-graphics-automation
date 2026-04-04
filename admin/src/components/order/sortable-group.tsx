"use client"

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import type { ArticleType, EditArticle } from "@/lib/types"
import { SortableCard } from "./sortable-card"

const TYPE_LABELS: Record<ArticleType, string> = {
  curation: "큐레이션",
  gray: "그레이",
  branded: "브랜디드",
}

interface SortableGroupProps {
  type: ArticleType
  articles: EditArticle[]
}

export function SortableGroup({ type, articles }: SortableGroupProps) {
  const ids = articles.map((a) => `${a.type}-${a.no}`)

  return (
    <div className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {TYPE_LABELS[type]}
        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-normal text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {articles.length}
        </span>
      </h2>

      {articles.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-400">해당 유형 아티클 없음</p>
      ) : (
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {articles.map((article) => (
              <SortableCard
                key={`${article.type}-${article.no}`}
                article={article}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  )
}
