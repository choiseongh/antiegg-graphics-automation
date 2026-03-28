"use client"

interface TitlePositionToggleProps {
  position: "top" | "bottom"
  onToggle: () => void
}

export function TitlePositionToggle({ position, onToggle }: TitlePositionToggleProps) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      title="게시글 표지 제목 위치"
    >
      제목 {position === "top" ? "상단" : "하단"}
    </button>
  )
}
