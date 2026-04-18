"use client"

import { useEffect, useMemo, useState } from "react"
import { useIssue } from "@/context/issue-context"
import { useToast } from "@/context/toast-context"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ShareConfirmModal } from "@/components/share/share-confirm-modal"
import { ShareProgressOverlay } from "@/components/share/share-progress-overlay"
import { PreviewBatchGrid, type PreviewItem } from "@/components/share/preview-batch-grid"
import { groupIntoBatches } from "@/lib/share-batching"

const RECIPIENT_NAMES = ["@형운", "@문수진", "@이재은"]

export default function SharePage() {
  const { state } = useIssue()
  const { addToast } = useToast()

  const [previews, setPreviews] = useState<PreviewItem[] | null>(null)
  const [loadingPreviews, setLoadingPreviews] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareResult, setShareResult] = useState<{ permalink?: string; error?: string } | null>(null)
  const [downloading, setDownloading] = useState(false)

  const { articles, newsletter, issue, date } = state

  const storageKey = issue ? `share-previews-${issue}` : null

  useEffect(() => {
    if (!issue || articles.length === 0) return
    if (storageKey) {
      const cached = sessionStorage.getItem(storageKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as PreviewItem[]
          setPreviews(parsed)
          return
        } catch {
          sessionStorage.removeItem(storageKey)
        }
      }
    }
    void fetchPreviews()
  }, [issue, articles.length])

  async function fetchPreviews() {
    setLoadingPreviews(true)
    setPreviewError(null)
    try {
      const resp = await fetch("/api/render-previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue, articles, newsletter }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        setPreviewError(err.error ?? "미리보기 로드 실패")
        addToast(err.error ?? "미리보기 로드 실패", "error")
        return
      }
      const data: { previews: PreviewItem[] } = await resp.json()
      setPreviews(data.previews)
      if (storageKey) {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(data.previews))
        } catch {}
      }
    } catch {
      setPreviewError("네트워크 오류")
      addToast("네트워크 오류", "error")
    } finally {
      setLoadingPreviews(false)
    }
  }

  const batches = useMemo(() => {
    if (!previews) return []
    return groupIntoBatches(previews, {
      articles: articles.map((a) => ({ type: a.type, order: a.order })),
    })
  }, [previews, articles])

  async function handleShare() {
    setConfirmOpen(false)
    setSharing(true)
    setShareResult(null)
    try {
      const resp = await fetch("/api/share-slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue, date, articles, newsletter }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.ok) {
        setShareResult({ error: data.error ?? "공유 실패" })
        addToast(data.error ?? "공유 실패", "error")
        return
      }
      setShareResult({ permalink: data.permalink })
      addToast(`${data.totalImages}장을 ${data.batchCount}개 배치로 전송했습니다.`, "success")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "네트워크 오류"
      setShareResult({ error: msg })
      addToast(msg, "error")
    } finally {
      setSharing(false)
    }
  }

  async function handleZipDownload() {
    setDownloading(true)
    try {
      const resp = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue, date, articles, newsletter }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        addToast(err.error ?? "ZIP 다운로드 실패", "error")
        return
      }
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${issue}호_${date}.zip`
      link.click()
      URL.revokeObjectURL(url)
      addToast("ZIP 다운로드 완료", "success")
    } catch {
      addToast("네트워크 오류", "error")
    } finally {
      setDownloading(false)
    }
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">아티클 데이터가 없습니다.</p>
      </div>
    )
  }

  const parentText = `[${issue}호] 그래픽 및 썸네일 공유드립니다. ${RECIPIENT_NAMES.join(" cc. ").replace(" cc. ", " ") /* display only */}`.replace(/ cc\. /, " ")

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {issue}호 추출/공유
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleZipDownload} disabled={downloading || sharing}>
            {downloading ? <><Spinner className="h-4 w-4" /> 다운로드 중...</> : "ZIP 다운로드"}
          </Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={sharing || downloading || loadingPreviews || !previews}>
            Slack으로 공유
          </Button>
        </div>
      </div>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="mb-2 text-xs font-medium text-zinc-500">📣 메시지 미리보기</div>
        <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-800 dark:text-zinc-200">
[{issue}호] 그래픽 및 썸네일 공유드립니다. @형운 cc. @문수진 @이재은
📎 {issue}호_{date}.zip
        </pre>
      </section>

      {loadingPreviews && (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Spinner className="h-4 w-4" />
          <span className="text-sm text-zinc-600 dark:text-zinc-300">이미지를 렌더링하고 있습니다... 1~2분 정도 걸려요.</span>
        </div>
      )}

      {previewError && !loadingPreviews && (
        <div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200">
          <span>미리보기 실패: {previewError}</span>
          <Button variant="secondary" onClick={() => void fetchPreviews()}>다시 시도</Button>
        </div>
      )}

      {previews && !loadingPreviews && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-zinc-500">
              전송될 이미지 {previews.length}장 · {batches.length}개 배치
            </div>
            <button
              onClick={() => {
                if (storageKey) sessionStorage.removeItem(storageKey)
                setPreviews(null)
                void fetchPreviews()
              }}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              다시 렌더링
            </button>
          </div>
          <PreviewBatchGrid batches={batches} />
        </>
      )}

      {confirmOpen && (
        <ShareConfirmModal
          issue={issue}
          date={date}
          imageCount={previews?.length ?? 0}
          batchCount={batches.length}
          articleCount={articles.length}
          onConfirm={handleShare}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {sharing && <ShareProgressOverlay />}

      {shareResult?.permalink && !sharing && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 shadow-lg dark:border-green-700 dark:bg-green-950/60">
          <span className="text-sm text-green-900 dark:text-green-200">✅ 공유 완료</span>
          <a
            href={shareResult.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-green-900 underline dark:text-green-200"
          >
            스레드 보기 →
          </a>
          <button onClick={() => setShareResult(null)} className="text-sm text-green-700 dark:text-green-300">✕</button>
        </div>
      )}
    </div>
  )
}
