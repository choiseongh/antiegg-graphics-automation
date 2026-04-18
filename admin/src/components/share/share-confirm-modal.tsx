"use client"

import { Button } from "@/components/ui/button"

interface ShareConfirmModalProps {
  issue: number
  date: string
  imageCount: number
  batchCount: number
  articleCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function ShareConfirmModal({
  issue,
  date,
  imageCount,
  batchCount,
  articleCount,
  onConfirm,
  onCancel,
}: ShareConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Slack 공유 확인
        </h3>
        <div className="mb-5 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800">
          <p className="mb-1 font-semibold text-zinc-800 dark:text-zinc-200">
            <span className="font-bold">#1-팀-크리에이티브</span>에 전송됩니다
          </p>
          <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">
            [{issue}호] 그래픽 및 썸네일 공유드립니다. @형운 cc. @문수진 @이재은{"\n"}
            📎 {issue}호_{date}.zip
          </p>
          <div className="mt-3 border-t border-zinc-200 pt-2 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            스레드에 이미지 <b>{imageCount}장</b>이 <b>{batchCount}개 배치</b>로 업로드되고,
            마지막에 작성자 <b>{articleCount}명</b>이 태그됩니다.
          </div>
        </div>
        <p className="mb-5 text-xs text-zinc-500">
          전송까지 약 3~7분이 걸립니다. 탭을 닫지 마세요.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>취소</Button>
          <Button onClick={onConfirm}>전송 시작</Button>
        </div>
      </div>
    </div>
  )
}
