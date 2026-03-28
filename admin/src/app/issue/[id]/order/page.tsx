"use client"

import { useCallback, useMemo } from "react"
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

  const globalIndexMap = useMemo(() => {
    const m = new Map<string, number>()
    state.articles.forEach((a, i) => m.set(`${a.type}-${a.no}`, i))
    return m
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

  function handleToggleTitlePosition(globalIndex: number) {
    dispatch({ type: "TOGGLE_TITLE_POSITION", payload: globalIndex })
  }

  if (state.articles.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">아티클 데이터가 없습니다. 홈에서 수집을 시작하세요.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          아티클 순서 편집
        </h2>
        <Button onClick={() => router.push(`/issue/${id}/edit`)}>
          다음 &rarr;
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {TYPES.map((type) => (
          <SortableGroup
            key={type}
            type={type}
            articles={grouped[type]}
            onToggleTitlePosition={handleToggleTitlePosition}
            globalIndexMap={globalIndexMap}
          />
        ))}
      </DndContext>

    </div>
  )
}
