"use client"

import { CharCounter } from "@/components/ui/char-counter"

interface IntroEditorProps {
  pages: string[]
  onChange: (pages: string[]) => void
}

export function IntroEditor({ pages, onChange }: IntroEditorProps) {
  function updatePage(index: number, value: string) {
    const next = [...pages]
    next[index] = value
    onChange(next)
  }

  function addPage() {
    if (pages.length >= 3) return
    onChange([...pages, ""])
  }

  function removePage() {
    if (pages.length <= 2) return
    onChange(pages.slice(0, -1))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          서문 ({pages.length}페이지)
        </span>
        <div className="flex gap-1">
          <button
            onClick={addPage}
            disabled={pages.length >= 3}
            className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            + 페이지
          </button>
          <button
            onClick={removePage}
            disabled={pages.length <= 2}
            className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            - 삭제
          </button>
        </div>
      </div>

      {pages.map((text, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-500">서문 {i + 1}</label>
            <CharCounter count={text.length} />
          </div>
          <textarea
            value={text}
            onChange={(e) => updatePage(i, e.target.value)}
            rows={4}
            className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            placeholder={`서문 ${i + 1} 내용`}
          />
        </div>
      ))}
    </div>
  )
}
