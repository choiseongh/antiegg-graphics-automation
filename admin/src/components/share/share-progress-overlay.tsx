"use client"

import { Spinner } from "@/components/ui/spinner"

export function ShareProgressOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-white px-8 py-6 shadow-xl dark:bg-zinc-900">
        <Spinner className="h-8 w-8" />
        <div className="text-center">
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Slack으로 전송 중</p>
          <p className="mt-1 text-sm text-zinc-500">
            이미지 렌더링 + 업로드에 3~7분이 걸려요. 탭을 닫지 마세요.
          </p>
        </div>
      </div>
    </div>
  )
}
