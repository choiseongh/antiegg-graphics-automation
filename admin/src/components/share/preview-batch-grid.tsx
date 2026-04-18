"use client"

import type { Batch } from "@/lib/share-batching"

export interface PreviewItem {
  name: string
  dataUrl: string
  width: number
  height: number
}

interface PreviewBatchGridProps {
  batches: Batch<PreviewItem>[]
}

export function PreviewBatchGrid({ batches }: PreviewBatchGridProps) {
  return (
    <div className="flex flex-col gap-6">
      {batches.map((batch, batchIdx) => (
        <div key={batchIdx} className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              배치 {batchIdx + 1}: {batch.label}
            </span>
            <span className="text-xs text-zinc-500">{batch.files.length}장</span>
          </div>
          <div className="grid grid-cols-5 gap-3 p-4">
            {batch.files.map((file) => (
              <div key={file.name} className="flex flex-col items-center gap-1.5">
                <div
                  className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                  style={{
                    width: 160,
                    aspectRatio: `${file.width} / ${file.height}`,
                  }}
                >
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="max-w-[160px] truncate text-[10px] text-zinc-500" title={file.name}>
                  {file.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
