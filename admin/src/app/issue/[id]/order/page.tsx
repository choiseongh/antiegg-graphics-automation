"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { useIssue } from "@/context/issue-context"
import { Button } from "@/components/ui/button"
import { SortableGroup } from "@/components/order/sortable-group"
import type { ArticleType } from "@/lib/types"

const TYPES: ArticleType[] = ["curation", "gray", "branded"]

export default function OrderPage() {
  const { state, dispatch } = useIssue()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const grouped = useMemo(() => {
    const map: Record<ArticleType, typeof state.articles> = {
      curation: [],
      gray: [],
      branded: [],
    }
    for (const a of state.articles) {
      map[a.type]?.push(a)
    }
    for (const type of TYPES) {
      map[type].sort((a, b) => a.order - b.order)
    }
    return map
  }, [state.articles])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeId = active.id as string
      const overId = over.id as string
      const activeType = activeId.split("-")[0] as ArticleType
      const overType = overId.split("-")[0] as ArticleType

      if (activeType !== overType) return

      const typeArticles = grouped[activeType]
      const fromIndex = typeArticles.findIndex((a) => `${a.type}-${a.no}` === activeId)
      const toIndex = typeArticles.findIndex((a) => `${a.type}-${a.no}` === overId)

      if (fromIndex === -1 || toIndex === -1) return

      dispatch({
        type: "REORDER_ARTICLES",
        payload: { articleType: activeType, fromIndex, toIndex },
      })
    },
    [grouped, dispatch],
  )

  const [sorting, setSorting] = useState(false)

  async function handleSlackSort() {
    setSorting(true)
    try {
      const resp = await fetch("/api/fetch-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue: state.issue }),
      })
      const data = await resp.json()
      if (resp.ok && data.articleOrder) {
        dispatch({ type: "SORT_BY_SLACK_ORDER", payload: data.articleOrder })
      }
    } catch { /* ignore */ }
    setSorting(false)
  }

  if (state.articles.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">아티클 데이터가 없습니다. 홈에서 수집을 시작하세요.</p>
      </div>
    )
  }

  const unmatchedCount = state.articles.filter((a) => a.slackOrderMatched === false).length

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          아티클 순서 편집
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSlackSort} disabled={sorting}>
            {sorting ? "정렬 중..." : "자동정렬"}
          </Button>
          <Button onClick={() => router.push(`/issue/${id}/edit`)}>
            다음 &rarr;
          </Button>
        </div>
      </div>

      {unmatchedCount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100">
          <strong>⚠ Slack 순서 매칭 실패: {unmatchedCount}건</strong>
          <p className="mt-1 text-xs">
            Slack 아티클 순서 메시지와 제목이 일치하지 않아 자동 배치되지 못한 아티클이 있습니다.
            아래 <span className="font-semibold">매칭 실패</span> 표시된 카드를 확인하고 수동으로 순서를 조정해주세요.
          </p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {TYPES.map((type) => (
          <SortableGroup
            key={type}
            type={type}
            articles={grouped[type]}
          />
        ))}
      </DndContext>

    </div>
  )
}
