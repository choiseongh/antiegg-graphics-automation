"use client"

import { useRouter, useParams } from "next/navigation"
import { useIssue } from "@/context/issue-context"
import { useToast } from "@/context/toast-context"
import { Button } from "@/components/ui/button"
import { CharCounter } from "@/components/ui/char-counter"
import type { EditArticle, ActiveTab } from "@/lib/types"

const IMAGE_POSITIONS = [
  { value: "top" as const, label: "상" },
  { value: "center" as const, label: "중" },
  { value: "bottom" as const, label: "하" },
]

interface EditPanelProps {
  article: EditArticle
  index: number
  activeTab: ActiveTab
}

export function EditPanel({ article, index, activeTab }: EditPanelProps) {
  const { dispatch } = useIssue()
  const { addToast } = useToast()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  function update(updates: Partial<EditArticle>) {
    dispatch({ type: "UPDATE_ARTICLE", payload: { index, updates } })
  }

  function switchToIntroTab(pageIndex: number) {
    const tab = `intro${pageIndex + 1}` as ActiveTab
    dispatch({ type: "SET_ACTIVE_TAB", payload: tab })
  }

  function updateIntroPage(pageIndex: number, value: string) {
    const pages = [...(article.introPages.length > 0 ? article.introPages : ["", ""])]
    pages[pageIndex] = value
    update({ introPages: pages })
  }

  function addIntroPage() {
    const pages = article.introPages.length > 0 ? article.introPages : ["", ""]
    if (pages.length >= 3) return
    update({ introPages: [...pages, ""] })
  }

  function removeIntroPage() {
    const pages = article.introPages.length > 0 ? article.introPages : ["", ""]
    if (pages.length <= 2) return
    update({ introPages: pages.slice(0, -1) })
  }

  async function handleAutoSplit() {
    try {
      const resp = await fetch("/api/process-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          introRaw: article.introRaw,
          title: article.title,
          subtitle: article.subtitle,
        }),
      })
      const result = await resp.json()
      if (!resp.ok) {
        addToast(result.error ?? "처리 실패", "error")
        return
      }
      dispatch({ type: "PROCESS_TEXT", payload: { index, result } })
      addToast("자동 분할 완료", "success")
    } catch {
      addToast("네트워크 오류", "error")
    }
  }

  function handleReset() {
    dispatch({ type: "RESET_ARTICLE", payload: { index } })
    addToast("초기화 완료", "info")
  }

  const introPages = article.introPages.length > 0 ? article.introPages : ["", ""]

  return (
    <div className="flex h-full flex-col">
      {/* Top: action buttons — flush to top */}
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleAutoSplit} className="!px-3 !py-1.5 !text-sm">자동 분할</Button>
          <Button variant="ghost" onClick={handleReset} className="!px-3 !py-1.5 !text-sm">초기화</Button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="flex min-h-0 flex-1 gap-10 pt-5">
      {/* Left column: title, subtitle, editor, toggles */}
      <div className="flex flex-col gap-8" style={{ width: "38%" }}>
        <Field label="제목 (2줄)">
          <textarea
            value={article.title2line}
            onChange={(e) => update({ title2line: e.target.value })}
            rows={2}
            className="input-field"
            placeholder={article.title}
          />
        </Field>

        <Field label="부제목 (2줄)">
          <textarea
            value={article.subtitle2line}
            onChange={(e) => update({ subtitle2line: e.target.value })}
            rows={2}
            className="input-field"
            placeholder={article.subtitle}
          />
        </Field>

        <Field label="에디터">
          <input
            value={article.editor}
            onChange={(e) => update({ editor: e.target.value })}
            className="input-field"
          />
        </Field>

        <Field label="제목 위치">
          <div className="flex gap-2">
            {(["top", "bottom"] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => {
                  update({ titlePosition: pos })
                  dispatch({ type: "SET_ACTIVE_TAB", payload: "post" })
                }}
                className={`rounded border px-3 py-1 text-xs ${
                  article.titlePosition === pos
                    ? "border-zinc-200 bg-zinc-200 font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100"
                    : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {pos === "top" ? "상단" : "하단"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="이미지 위치">
          <div className="flex gap-2">
            {IMAGE_POSITIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => update({ imagePosition: p.value })}
                className={`rounded border px-3 py-1 text-xs ${
                  article.imagePosition === p.value
                    ? "border-zinc-200 bg-zinc-200 font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100"
                    : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

      </div>

      {/* Right column: intro pages */}
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500">서문 ({introPages.length}페이지)</span>
          <div className="flex gap-1">
            <button onClick={addIntroPage} disabled={introPages.length >= 3} className="rounded border border-zinc-300 px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">+</button>
            <button onClick={removeIntroPage} disabled={introPages.length <= 2} className="rounded border border-zinc-300 px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">&minus;</button>
          </div>
        </div>

        {introPages.map((text, i) => (
          <div key={i} className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-500">서문 {i + 1}</label>
              <CharCounter count={text.length} />
            </div>
            <textarea
              value={text}
              onChange={(e) => updateIntroPage(i, e.target.value)}
              onFocus={() => switchToIntroTab(i)}
              className="input-field flex-1 resize-none"
              placeholder={`서문 ${i + 1} 내용`}
            />
          </div>
        ))}
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
