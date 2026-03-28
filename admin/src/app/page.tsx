"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useIssue } from "@/context/issue-context"
import { useToast } from "@/context/toast-context"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { WorkHistory } from "@/components/start/work-history"
import type { WorkHistoryEntry, FetchArticlesResponse } from "@/lib/types"

export default function StartPage() {
  const [issue, setIssue] = useState("")
  const [loading, setLoading] = useState(false)
  const { dispatch, restoreFromStorage } = useIssue()
  const { addToast } = useToast()
  const router = useRouter()
  const [history, setHistory] = useLocalStorage<WorkHistoryEntry[]>("work-history", [])

  async function handleStart() {
    const issueNum = Number(issue)
    if (!issueNum || issueNum <= 0) {
      addToast("유효한 호수를 입력하세요.", "error")
      return
    }

    setLoading(true)
    try {
      const resp = await fetch("/api/fetch-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue: issueNum }),
      })

      const data: FetchArticlesResponse & { error?: string } = await resp.json()

      if (!resp.ok) {
        addToast(data.error ?? "아티클 수집에 실패했습니다.", "error")
        return
      }

      dispatch({ type: "SET_ARTICLES", payload: data })
      updateHistory(data)
      addToast(`${data.articles.length}개 아티클 수집 완료`, "success")
      router.push(`/issue/${issueNum}/order`)
    } catch {
      addToast("네트워크 오류가 발생했습니다.", "error")
    } finally {
      setLoading(false)
    }
  }

  function updateHistory(data: FetchArticlesResponse) {
    setHistory((prev) => {
      const filtered = prev.filter((e) => e.issue !== data.issue)
      const entry: WorkHistoryEntry = {
        issue: data.issue,
        date: data.date,
        lastAccessed: new Date().toISOString(),
        articleCount: data.articles.length,
      }
      return [entry, ...filtered].slice(0, 10)
    })
  }

  function handleRestore(issueNum: number) {
    const restored = restoreFromStorage(issueNum)
    if (restored) {
      addToast(`${issueNum}호 작업을 복원했습니다.`, "success")
      router.push(`/issue/${issueNum}/order`)
    } else {
      setIssue(String(issueNum))
      addToast("저장된 작업이 없습니다. 새로 수집합니다.", "info")
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          ANTIEGG 정기그래픽
        </h1>
        <p className="text-sm text-zinc-500">주간 인스타그램 카드뉴스 자동 생성</p>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
          <input
            type="number"
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="호수"
            className="w-20 bg-transparent text-center text-lg font-semibold outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            min={1}
            disabled={loading}
          />
          <span className="text-zinc-400">호</span>
        </div>
        <Button onClick={handleStart} disabled={loading || !issue}>
          {loading ? (
            <>
              <Spinner className="h-4 w-4" />
              수집 중...
            </>
          ) : (
            "제작 시작"
          )}
        </Button>
      </div>

      <WorkHistory entries={history} onSelect={handleRestore} />
    </main>
  )
}
