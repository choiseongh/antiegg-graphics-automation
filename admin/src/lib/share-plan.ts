import type { RenderedImage } from "./render-all-images"
import { groupIntoBatches, buildParentText, buildFinalMessage, type Batch } from "./share-batching"

export interface SharePlan {
  parentText: string
  zipFilename: string
  batches: Batch<RenderedImage>[]
  finalMessage: string
  totalImages: number
}

interface PlanInput {
  issue: number
  date: string
  articles: { type: string; order: number; editor: string }[]
  recipients: { primary: string; cc: string[] }
  editorResolvedIds: Record<string, string>
  unmatchedEditors: string[]
  renderedImages: RenderedImage[]
}

export function buildSharePlan(input: PlanInput): SharePlan {
  const { issue, date, articles, recipients, editorResolvedIds, renderedImages } = input

  const batches = groupIntoBatches(renderedImages, {
    articles: articles.map((a) => ({ type: a.type, order: a.order })),
  })

  return {
    parentText: buildParentText(issue, recipients.primary, recipients.cc),
    zipFilename: `${issue}호_${date}.zip`,
    batches,
    finalMessage: buildFinalMessage(articles, editorResolvedIds),
    totalImages: renderedImages.length,
  }
}
