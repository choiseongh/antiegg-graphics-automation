"use client"

import { useState } from "react"
import { useIssue } from "@/context/issue-context"
import { useToast } from "@/context/toast-context"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ProgressBar } from "@/components/export/progress-bar"
import { ThumbnailGrid } from "@/components/export/thumbnail-grid"

export default function ExportPage() {
  const { state } = useIssue()
  const { addToast } = useToast()
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" })

  const totalImages = state.articles.reduce((sum, a) => {
    const introCount = a.introPages.length > 0 ? a.introPages.length : 2
    return sum + 2 + introCount
  }, 0)

  async function handleExport() {
    setExporting(true)
    setProgress({ current: 0, total: totalImages, label: "준비 중..." })

    try {
      const resp = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue: state.issue,
          date: state.date,
          articles: state.articles,
          newsletter: state.newsletter,
        }),
      })

      if (!resp.ok) {
        const err = await resp.json()
        addToast(err.error ?? "추출 실패", "error")
        return
      }

      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${state.issue}호_${state.date}.zip`
      link.click()
      URL.revokeObjectURL(url)

      setProgress({ current: totalImages, total: totalImages, label: "완료" })
      addToast("ZIP 다운로드 완료", "success")
    } catch {
      addToast("네트워크 오류", "error")
    } finally {
      setExporting(false)
    }
  }

  if (state.articles.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">아티클 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {state.issue}호 최종 추출
        </h2>
        <Button
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <Spinner className="h-4 w-4" />
              추출 중...
            </>
          ) : (
            "전체 추출 (ZIP)"
          )}
        </Button>
      </div>

      {exporting && (
        <div className="mb-4">
          <ProgressBar
            current={progress.current}
            total={progress.total}
            label={progress.label}
          />
        </div>
      )}

      <ThumbnailGrid articles={state.articles} newsletter={state.newsletter} issue={state.issue} />
    </div>
  )
}
