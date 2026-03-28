"use client"

import React, { useMemo, useState } from "react"
import { useIssue } from "@/context/issue-context"
import { useToast } from "@/context/toast-context"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/use-debounce"
import { renderNlPreviewCover } from "@/templates/render-nl-preview-cover"
import { renderNlPreviewIntro } from "@/templates/render-nl-preview-intro"
import { renderNlStoryCover } from "@/templates/render-nl-story-cover"
import { renderNlStoryList, splitArticlesIntoPages } from "@/templates/render-nl-story-list"

const TYPE_LABELS: Record<string, string> = {
  curation: "Curation",
  gray: "Gray",
  branded: "Branded",
}

type NlTab = "cover" | "intro" | "story-cover" | "story-list"

const NL_TABS: { key: NlTab; label: string }[] = [
  { key: "cover", label: "미리보기 표지" },
  { key: "intro", label: "미리보기 서문" },
  { key: "story-cover", label: "스토리 표지" },
  { key: "story-list", label: "스토리 목록" },
]

export function NewsletterPanel() {
  const { state, dispatch } = useIssue()
  const { addToast } = useToast()
  const { newsletter, issue, articles } = state

  async function handleFetchFromSlack() {
    try {
      const resp = await fetch("/api/fetch-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        addToast(data.error ?? "Slack 불러오기 실패", "error")
        return
      }
      dispatch({ type: "UPDATE_NEWSLETTER", payload: data })
      addToast("Slack에서 뉴스레터 정보를 불러왔습니다.", "success")
    } catch {
      addToast("네트워크 오류", "error")
    }
  }

  const [activeNlTab, setActiveNlTab] = useState<NlTab>("cover")
  const [listPageIdx, setListPageIdx] = useState(0)

  const debouncedNewsletter = useDebounce(newsletter, 300)
  const debouncedArticles = useDebounce(articles, 300)

  const previewHtml = useMemo(() => {
    const nl = debouncedNewsletter
    const arts = debouncedArticles

    switch (activeNlTab) {
      case "cover":
        return { html: renderNlPreviewCover({ issue, title: nl.title || "뉴스레터 제목을 입력하세요" }), width: 1080, height: 1350 }
      case "intro":
        return { html: renderNlPreviewIntro({ issue, intro: nl.intro || "뉴스레터 서문을 입력하세요", publisher: nl.publisher || "발행인" }), width: 1080, height: 1350 }
      case "story-cover":
        return { html: renderNlStoryCover({ issue, title: nl.title || "제목", intro: nl.intro || "서문", publisher: nl.publisher || "발행인" }), width: 1080, height: 1920 }
      case "story-list": {
        const listItems = arts.map((a) => ({ typeLabel: TYPE_LABELS[a.type] ?? a.type, type: a.type, title: a.title }))
        const pages = splitArticlesIntoPages(listItems)
        const pageIdx = Math.min(listPageIdx, pages.length - 1)
        return { html: renderNlStoryList({ issue, articles: pages[pageIdx] ?? [], pageIndex: pageIdx }), width: 1080, height: 1920 }
      }
      default:
        return { html: "", width: 1080, height: 1350 }
    }
  }, [activeNlTab, debouncedNewsletter, debouncedArticles, issue, listPageIdx])

  const isStory = activeNlTab === "story-cover" || activeNlTab === "story-list"
  const scale = isStory ? 0.25 : 0.3

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        {/* Left: tabs + preview */}
        <div className="flex flex-col border-r border-zinc-200 dark:border-zinc-800" style={{ width: "40%" }}>
          <div className="flex shrink-0 gap-1.5 border-b border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            {NL_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveNlTab(t.key)}
                className={`rounded-md px-4 py-2 text-sm transition-colors ${
                  activeNlTab === t.key
                    ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                    : "font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex flex-1 items-start justify-center bg-zinc-100 p-3 dark:bg-zinc-900">
          {activeNlTab === "story-list" && (() => {
            const totalPages = splitArticlesIntoPages(articles.map((a) => ({ typeLabel: TYPE_LABELS[a.type] ?? a.type, type: a.type, title: a.title }))).length
            return totalPages > 1 ? (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 rounded-full bg-white/80 px-4 py-1 shadow-sm backdrop-blur dark:bg-zinc-800/80">
                <button onClick={() => setListPageIdx(Math.max(0, listPageIdx - 1))} disabled={listPageIdx === 0} className="text-xs text-zinc-400 disabled:opacity-30">&larr;</button>
                <span className="text-xs text-zinc-500">{listPageIdx + 1}/{totalPages}</span>
                <button onClick={() => setListPageIdx(Math.min(totalPages - 1, listPageIdx + 1))} disabled={listPageIdx >= totalPages - 1} className="text-xs text-zinc-400 disabled:opacity-30">&rarr;</button>
              </div>
            ) : null
          })()}
            <div
              className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
              style={{ width: previewHtml.width * scale, height: previewHtml.height * scale }}
            >
              <iframe
                srcDoc={previewHtml.html}
                title="뉴스레터 미리보기"
                style={{ width: previewHtml.width, height: previewHtml.height, transform: `scale(${scale})`, transformOrigin: "top left", border: "none" }}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>

        {/* Right: edit fields */}
        <div className="flex flex-1 flex-col overflow-y-auto p-5">
          <div className="flex shrink-0 gap-2 mb-5">
            <Button variant="secondary" onClick={handleFetchFromSlack} className="!px-3 !py-1.5 !text-sm">Slack에서 불러오기</Button>
          </div>
          <div className="flex flex-col gap-6">
            <Field label="뉴스레터 제목">
              <textarea
                value={newsletter.title}
                onChange={(e) => dispatch({ type: "UPDATE_NEWSLETTER", payload: { title: e.target.value } })}
                rows={2}
                className="input-field"
                placeholder="나이가 들수록 시간이 빠르게 흘러가는 이유"
              />
            </Field>

            <Field label="뉴스레터 서문 (** 로 볼드 강조)">
              <textarea
                value={newsletter.intro}
                onChange={(e) => dispatch({ type: "UPDATE_NEWSLETTER", payload: { intro: e.target.value } })}
                rows={8}
                className="input-field"
                placeholder="최근 우연히 '자네의 법칙'을 접했습니다..."
              />
            </Field>

            <Field label="발행인">
              <input
                value={newsletter.publisher}
                onChange={(e) => dispatch({ type: "UPDATE_NEWSLETTER", payload: { publisher: e.target.value } })}
                className="input-field"
                placeholder="형운"
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-zinc-500">{label}</label>
      {children}
    </div>
  )
}
