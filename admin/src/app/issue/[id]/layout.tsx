"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { useIssue } from "@/context/issue-context"
import type { ReactNode } from "react"

const steps = [
  { label: "순서", path: "order" },
  { label: "편집", path: "edit" },
  { label: "추출", path: "export" },
]

export default function IssueLayout({ children }: { children: ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const { state } = useIssue()
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
