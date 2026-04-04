"use client"

import { useMemo, useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import { splitArticlesIntoPages } from "@/templates/render-nl-story-list"
import type { EditArticle, NewsletterData } from "@/lib/types"

const TYPE_LABELS: Record<string, string> = {
  curation: "큐레이션",
  gray: "그레이",
  branded: "브랜디드",
}

type CardType = "story" | "post" | "intro" | "last-page" | "nl-cover" | "nl-intro" | "nl-article" | "nl-story-cover" | "nl-story-list" | "nl-last-page"

interface CardInfo {
  article?: EditArticle
  label: string
  cardType: CardType
  introIndex?: number
  nlData?: { issue: number; newsletter: NewsletterData; articleIndex?: number; listPageIndex?: number; lastPageFilename?: string }
}

interface ThumbnailGridProps {
  articles: EditArticle[]
  newsletter?: NewsletterData
  issue?: number
}

export function ThumbnailGrid({ articles, newsletter, issue }: ThumbnailGridProps) {
  const [exportingIdx, setExportingIdx] = useState<number | null>(null)

  const cards = useMemo(() => {
    const result: CardInfo[] = []
    for (const a of articles) {
      const typeKr = TYPE_LABELS[a.type] ?? a.type
      const prefix = `${typeKr} ${a.order}`
      result.push({ article: a, label: `${prefix}-1 (표지)`, cardType: "story" })
      result.push({ article: a, label: `${prefix}-2 (게시물)`, cardType: "post" })
      const pages = a.introPages.length > 0 ? a.introPages : ["", ""]
      pages.forEach((_, i) => {
        result.push({ article: a, label: `${prefix}-${i + 3} (서문${i + 1})`, cardType: "intro", introIndex: i })
      })
    }
    // 유형별 마지막장
    const presentTypes = new Set(articles.map((a) => a.type as string))
    const LAST_PAGES: { type: string; label: string; filename: string }[] = [
      { type: "curation", label: "큐레이션 마지막장", filename: "큐레이션 마지막장.png" },
      { type: "gray", label: "그레이 마지막장", filename: "그레이 마지막장.png" },
      { type: "branded", label: "브랜디드 마지막장", filename: "브랜디드 마지막장.png" },
    ]
    for (const lp of LAST_PAGES) {
      if (presentTypes.has(lp.type)) {
        result.push({ label: lp.label, cardType: "last-page" as CardType, nlData: { issue: issue ?? 0, newsletter: newsletter ?? { title: "", intro: "", publisher: "" }, lastPageFilename: lp.filename } as CardInfo["nlData"] })
      }
    }

    // Newsletter cards
    if (newsletter && newsletter.title && issue) {
      const nl = { issue, newsletter }
      result.push({ label: "뉴스레터 미리보기-1 (표지)", cardType: "nl-cover", nlData: nl })
      result.push({ label: "뉴스레터 미리보기-2 (서문)", cardType: "nl-intro", nlData: nl })
      for (let i = 0; i < articles.length; i++) {
        result.push({ article: articles[i], label: `뉴스레터 미리보기-${i + 3} (${TYPE_LABELS[articles[i].type]} ${articles[i].order})`, cardType: "nl-article", nlData: { ...nl, articleIndex: i } })
      }
      result.push({ label: "뉴스레터 미리보기-마지막장", cardType: "nl-last-page", nlData: { ...nl, lastPageFilename: "뉴스레터 미리보기-마지막장.png" } })
      result.push({ label: "뉴스레터 스토리-1 (표지)", cardType: "nl-story-cover", nlData: nl })
      const listItems = articles.map((a) => ({ typeLabel: TYPE_LABELS[a.type] ?? a.type, type: a.type, title: a.title }))
      const listPages = splitArticlesIntoPages(listItems)
      listPages.forEach((_, i) => {
        result.push({ label: `뉴스레터 스토리-${i + 2} (목록${i + 1})`, cardType: "nl-story-list", nlData: { ...nl, listPageIndex: i } })
      })
    }

    return result
  }, [articles, newsletter, issue])

  async function handleSingleExport(card: CardInfo, idx: number) {
    setExportingIdx(idx)
    try {
      const resp = await fetch("/api/export-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article: card.article,
          cardType: card.cardType,
          introIndex: card.introIndex,
          nlData: card.nlData ? {
            ...card.nlData,
            articles: articles.map((a) => ({ type: a.type, order: a.order, title: a.title, subtitle: a.subtitle, heroImage: a.heroImage })),
          } : undefined,
        }),
      })
      if (!resp.ok) return

      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = card.label.replace(/\s*\(.*\)/, "") + ".png"
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingIdx(null)
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500">총 {cards.length}장</p>
      <div className="grid grid-cols-5 gap-3">
        {cards.map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="flex h-24 w-16 flex-col items-center justify-center gap-1.5 rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
              <span className="text-[10px] text-zinc-400">
                {c.cardType === "story" ? "1920" : "1350"}
              </span>
              <button
                onClick={() => handleSingleExport(c, i)}
                disabled={exportingIdx !== null}
                className="rounded bg-zinc-200 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-300 disabled:opacity-40 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
              >
                {exportingIdx === i ? <Spinner className="h-2.5 w-2.5" /> : "추출"}
              </button>
            </div>
            <span className="max-w-full truncate text-[10px] text-zinc-500">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
