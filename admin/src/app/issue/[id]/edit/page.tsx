"use client"

import { useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { useIssue } from "@/context/issue-context"
import { PreviewIframe } from "@/components/edit/preview-iframe"
import { EditPanel } from "@/components/edit/edit-panel"
import { NewsletterPanel } from "@/components/edit/newsletter-panel"
import type { ActiveTab, ArticleType } from "@/lib/types"

const TYPE_LABELS: Record<string, string> = {
  curation: "큐레이션",
  gray: "그레이",
  branded: "브랜디드",
}

const TYPE_ORDER: ArticleType[] = ["curation", "gray", "branded"]

const TABS: { key: ActiveTab; label: string }[] = [
  { key: "story", label: "스토리" },
  { key: "post", label: "표지" },
  { key: "nl-preview", label: "뉴스레터 미리보기" },
  { key: "intro1", label: "서문1" },
  { key: "intro2", label: "서문2" },
  { key: "intro3", label: "서문3" },
]

export default function EditPage() {
  const { state, dispatch } = useIssue()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const idx = state.activeArticleIndex
  const article = state.articles[idx]

  // Group articles by type for numbered pills
  const typeGroups = useMemo(() => {
    const groups: { type: ArticleType; label: string; articles: { globalIndex: number; order: number }[] }[] = []
    for (const t of TYPE_ORDER) {
      const arts = state.articles
        .map((a, i) => ({ globalIndex: i, order: a.order, type: a.type }))
        .filter((a) => a.type === t)
        .sort((a, b) => a.order - b.order)
      if (arts.length > 0) {
        groups.push({ type: t, label: TYPE_LABELS[t], articles: arts })
      }
    }
    return groups
  }, [state.articles])

  const visibleTabs = useMemo(() => {
    if (!article) return TABS.slice(0, 2)
    return TABS.filter((t) => {
      if (t.key === "intro3") return article.introPages.length >= 3
      if (t.key === "intro2") return article.introPages.length >= 2
      return true
    })
  }, [article])

  if (!article) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">아티클 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar: unified navigation */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Left: arrows + [뉴스레터] + numbered pills */}
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => {
                if (state.editMode === "newsletter") { /* already first, do nothing */ }
                else if (idx === 0) dispatch({ type: "SET_EDIT_MODE", payload: "newsletter" })
                else dispatch({ type: "SET_ACTIVE_ARTICLE", payload: idx - 1 })
              }}
              disabled={state.editMode === "newsletter"}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-30 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              onClick={() => {
                if (state.editMode === "newsletter") {
                  dispatch({ type: "SET_EDIT_MODE", payload: "articles" })
                  dispatch({ type: "SET_ACTIVE_ARTICLE", payload: 0 })
                } else if (idx < state.articles.length - 1) {
                  dispatch({ type: "SET_ACTIVE_ARTICLE", payload: idx + 1 })
                }
              }}
              disabled={state.editMode === "articles" && idx === state.articles.length - 1}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-30 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          {/* Newsletter pill */}
          <button
            onClick={() => dispatch({ type: "SET_EDIT_MODE", payload: "newsletter" })}
            className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
              state.editMode === "newsletter"
                ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                : "font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            뉴스레터
          </button>

          {/* Type-grouped numbered pills */}
          <div className="flex items-center gap-4">
            {typeGroups.map((group) => (
              <div key={group.type} className="flex items-center gap-1">
                <span className="mr-1 text-xs text-zinc-400">{group.label}</span>
                {group.articles.map((a) => (
                  <button
                    key={a.globalIndex}
                    onClick={() => {
                      dispatch({ type: "SET_EDIT_MODE", payload: "articles" })
                      dispatch({ type: "SET_ACTIVE_ARTICLE", payload: a.globalIndex })
                    }}
                    className={`flex h-6 w-6 items-center justify-center rounded text-xs transition-colors ${
                      state.editMode === "articles" && a.globalIndex === idx
                        ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                        : "font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {a.order}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right: export CTA */}
        <button
          onClick={() => router.push(`/issue/${id}/export`)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            추출 &rarr;
          </button>
      </div>

      {/* Main content — switch between articles and newsletter */}
      {state.editMode === "newsletter" && (
        <NewsletterPanel />
      )}
      {state.editMode === "articles" && (
        <div className="flex min-h-0 flex-1">
          {/* Left: page tabs + preview */}
          <div className="flex flex-col border-r border-zinc-200 dark:border-zinc-800" style={{ width: "40%" }}>
            <div className="flex shrink-0 gap-1.5 border-b border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              {visibleTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => dispatch({ type: "SET_ACTIVE_TAB", payload: t.key })}
                  className={`rounded-md px-4 py-2 text-sm transition-colors ${
                    state.activeTab === t.key
                      ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                      : "font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-1 items-center justify-center bg-zinc-100 p-3 dark:bg-zinc-900">
              <PreviewIframe article={article} activeTab={state.activeTab} />
            </div>
          </div>

          {/* Right: edit panel (2-column, internal scroll) */}
          <div className="flex flex-1 flex-col overflow-y-auto p-5">
            <EditPanel article={article} index={idx} activeTab={state.activeTab} />
          </div>
        </div>
      )}
    </div>
  )
}
