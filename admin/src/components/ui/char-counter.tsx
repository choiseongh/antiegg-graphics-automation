"use client"

export function CharCounter({ count, warn = 170 }: { count: number; warn?: number }) {
  return (
    <span className={`text-xs tabular-nums ${count > warn ? "text-amber-500" : "text-zinc-400"}`}>
      {count}자
    </span>
  )
}
