export const TYPE_NAMES_KR: Record<string, string> = {
  curation: "큐레이션",
  gray: "그레이",
  branded: "브랜디드",
}

export const LAST_PAGE_FILES: Record<string, string> = {
  curation: "큐레이션 마지막장.png",
  gray: "그레이 마지막장.png",
  branded: "브랜디드 마지막장.png",
}

export const MAX_FILES_PER_BATCH = 10

export interface Batch<T extends { name: string }> {
  label: string
  files: T[]
}

interface GroupInput {
  articles: { type: string; order: number }[]
}

export function groupIntoBatches<T extends { name: string }>(
  items: T[],
  input: GroupInput,
): Batch<T>[] {
  const byName = new Map(items.map((i) => [i.name, i]))
  const batches: Batch<T>[] = []

  const nlStoryCover = byName.get("뉴스레터 미리보기 스토리-1.png")
  const nlStoryList: T[] = []
  for (let i = 2; ; i++) {
    const img = byName.get(`뉴스레터 미리보기 스토리-${i}.png`)
    if (!img) break
    nlStoryList.push(img)
  }
  const nlPreview: T[] = []
  for (let i = 1; ; i++) {
    const img = byName.get(`뉴스레터 미리보기-${i}.png`)
    if (!img) break
    nlPreview.push(img)
  }
  const nlLast = byName.get("뉴스레터 미리보기-마지막장.png")

  const firstSlotsUsed = (nlStoryCover ? 1 : 0) + nlStoryList.length
  const nlFirstBatch: T[] = []
  if (nlStoryCover) nlFirstBatch.push(nlStoryCover)
  nlFirstBatch.push(...nlStoryList)
  const previewSliceEnd = Math.max(0, MAX_FILES_PER_BATCH - firstSlotsUsed)
  nlFirstBatch.push(...nlPreview.slice(0, previewSliceEnd))
  if (nlFirstBatch.length > 0) {
    batches.push({ label: "뉴스레터 스토리 + 미리보기 1부", files: nlFirstBatch })
  }

  const remainingNl: T[] = nlPreview.slice(previewSliceEnd)
  if (nlLast) remainingNl.push(nlLast)
  if (remainingNl.length > 0) {
    batches.push({ label: "뉴스레터 미리보기 2부 + 마지막장", files: remainingNl })
  }

  const grouped: Record<string, { type: string; order: number }[]> = {}
  for (const a of input.articles) {
    if (!grouped[a.type]) grouped[a.type] = []
    grouped[a.type].push(a)
  }
  for (const type of Object.keys(grouped)) {
    grouped[type].sort((a, b) => a.order - b.order)
  }

  for (const type of ["curation", "gray", "branded"]) {
    const typeArticles = grouped[type]
    if (!typeArticles || typeArticles.length === 0) continue
    const typeKr = TYPE_NAMES_KR[type]
    const lastPageFile = LAST_PAGE_FILES[type]
    const lastPageImg = lastPageFile ? byName.get(lastPageFile) : undefined

    for (let i = 0; i < typeArticles.length; i += 2) {
      const group = typeArticles.slice(i, i + 2)
      const files: T[] = []
      for (const a of group) {
        const prefix = `${typeKr} ${a.order}`
        files.push(...collectArticleImages(prefix, byName))
      }
      const isLastGroup = i + 2 >= typeArticles.length
      if (isLastGroup && lastPageImg && files.length + 1 <= MAX_FILES_PER_BATCH) {
        files.push(lastPageImg)
      }
      if (files.length > MAX_FILES_PER_BATCH) {
        throw new Error(`배치 구성 오류: ${typeKr} ${group.map((g) => g.order).join("-")} 그룹이 ${files.length}개로 Slack 한 메시지당 최대 ${MAX_FILES_PER_BATCH}장 제한 초과`)
      }
      const labelSuffix = group.length === 2
        ? `${group[0].order}-${group[1].order}`
        : `${group[0].order}`
      batches.push({ label: `${typeKr} ${labelSuffix}`, files })
    }

    const lastBatchForType = batches[batches.length - 1]
    const lastPageIncluded = lastPageImg && lastBatchForType.files.includes(lastPageImg)
    if (lastPageImg && !lastPageIncluded) {
      batches.push({ label: `${typeKr} 마지막장`, files: [lastPageImg] })
    }
  }

  return batches
}

const MAX_IMAGES_PER_ARTICLE = Math.floor(MAX_FILES_PER_BATCH / 2)

function collectArticleImages<T extends { name: string }>(prefix: string, byName: Map<string, T>): T[] {
  const out: T[] = []
  for (let i = 1; i <= MAX_IMAGES_PER_ARTICLE; i++) {
    const img = byName.get(`${prefix}-${i}.png`)
    if (img) out.push(img)
    else break
  }
  return out
}

export function buildParentText(issue: number, primary: string, cc: string[]): string {
  const ccMentions = cc.map((id) => `<@${id}>`).join(" ")
  return `*[${issue}호] 그래픽 및 썸네일 공유드립니다. <@${primary}> cc. ${ccMentions}*`
}

export function buildFinalMessage(
  articles: { editor: string }[],
  resolvedIds: Record<string, string>,
): string {
  const mentions = articles.map((a) => {
    const id = resolvedIds[a.editor]
    return id ? `<@${id}>` : `@${a.editor}`
  }).join(" ")
  return `아티클 작성자 : ${mentions}`
}
