"use client"

import { useMemo } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { useIssue } from "@/context/issue-context"
import { renderStoryCover } from "@/templates/render-story-cover"
import { renderPostCover } from "@/templates/render-post-cover"
import { renderIntroPage } from "@/templates/render-intro-page"
import { renderNlPreviewArticle } from "@/templates/render-nl-preview-article"
import type { EditArticle, ActiveTab } from "@/lib/types"

const TYPE_LABELS: Record<string, string> = {
  curation: "Curation",
  gray: "Gray",
  branded: "Branded",
}

interface PreviewIframeProps {
  article: EditArticle
  activeTab: ActiveTab
}

export function PreviewIframe({ article, activeTab }: PreviewIframeProps) {
  const debouncedArticle = useDebounce(article, 300)
  const { state } = useIssue()

  const html = useMemo(() => {
    const a = debouncedArticle
    const typeLabel = TYPE_LABELS[a.type] ?? a.type

    switch (activeTab) {
      case "story":
        return renderStoryCover({
          typeLabel,
          type: a.type,
          title2line: a.title2line || a.title,
          subtitle2line: a.subtitle2line || a.subtitle,
          heroImage: a.heroImage,
          imagePosition: a.imagePositions.story.y,
          imagePositionX: a.imagePositions.story.x,
        })
      case "post":
        return renderPostCover({
          typeLabel,
          type: a.type,
          title2line: a.postTitle2line || a.title2line || a.title,
          editor: a.editor,
          heroImage: a.heroImage,
          titlePosition: a.titlePosition,
          imagePosition: a.imagePositions.post.y,
          imagePositionX: a.imagePositions.post.x,
        })
      case "nl-preview":
        return renderNlPreviewArticle({
          issue: state.issue,
          typeLabel,
          type: a.type,
          title: a.nlTitle2line || a.title2line || a.title,
          subtitle: a.subtitle,
          heroImage: a.heroImage,
          imagePosition: a.imagePositions["nl-preview"].y,
          imagePositionX: a.imagePositions["nl-preview"].x,
        })
      case "intro1":
      case "intro2":
      case "intro3": {
        const idx = Number(activeTab.replace("intro", "")) - 1
        const pageText = a.introPages[idx] ?? ""
        const paragraphs = pageText
          .split("\n\n")
          .filter(Boolean)
          .map((p) => p.replace(/\n/g, "<br>"))
        return renderIntroPage({
          articleTitle: a.introTitle || a.title,
          introParagraphs: paragraphs.length > 0 ? paragraphs : [""],
        })
      }
      default:
        return ""
    }
  }, [debouncedArticle, activeTab])

  const isStory = activeTab === "story"
  const width = 1080
  const height = isStory ? 1920 : 1350
  const scale = isStory ? 0.25 : 0.3

  return (
    <div
      className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
      style={{
        width: width * scale,
        height: height * scale,
      }}
    >
      <iframe
        srcDoc={html}
        title="미리보기"
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          border: "none",
        }}
        sandbox="allow-same-origin"
      />
    </div>
  )
}
