"use client"

import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { useIssue } from "@/context/issue-context"
import { useToast } from "@/context/toast-context"
import type { ReactNode } from "react"

const steps = [
  { label: "순서", path: "order" },
  { label: "편집", path: "edit" },
  { label: "추출", path: "export" },
]

export default function IssueLayout({ children }: { children: ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const { state, dispatch } = useIssue()
  const id = params.id as string
  const currentStep = pathname.split("/").pop()

  return (
    <div className="flex flex-1">
      {/* Left sidebar */}
      <aside className="flex w-[180px] shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 pt-3 pb-4 dark:border-zinc-800">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            &larr; 홈
          </Link>
          <h1 className="mt-3 text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-100">
            {state.issue || id}호
          </h1>
          {state.date && (
            <span className="-mt-0.5 text-xs text-zinc-500">{state.date}</span>
          )}
          <RefreshButton issue={state.issue} dispatch={dispatch} />
        </div>
        <nav className="flex flex-col gap-1 px-3 py-3">
          {steps.map((step) => {
            const isActive = currentStep === step.path
            const href = `/issue/${id}/${step.path}`
            return (
              <Link
                key={step.path}
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500 dark:bg-zinc-400" />}
                {step.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}

function RefreshButton({ issue, dispatch }: { issue: number; dispatch: React.Dispatch<import("@/lib/types").IssueAction> }) {
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  async function handleRefresh() {
    if (!issue || loading) return
    setLoading(true)
    try {
      const resp = await fetch("/api/fetch-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        addToast(data.error ?? "불러오기 실패", "error")
        return
      }
      dispatch({ type: "SET_ARTICLES", payload: data })
      addToast("데이터를 다시 불러왔습니다.", "success")
    } catch {
      addToast("네트워크 오류", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="mt-2 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}>
        <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
      {loading ? "불러오는 중..." : "다시 불러오기"}
    </button>
  )
}
