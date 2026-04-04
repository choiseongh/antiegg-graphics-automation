import type { ArticleType } from "./types"

const SLACK_CHANNEL_ID = "C03CXG0P6A3"

interface SlackOrderItem {
  type: ArticleType
  title: string
}

export async function fetchSlackArticleOrder(issue: number): Promise<SlackOrderItem[]> {
  const slackToken = process.env.SLACK_BOT_TOKEN
  if (!slackToken) return []

  const resp = await fetch(
    `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}&limit=100`,
    { headers: { Authorization: `Bearer ${slackToken}` } },
  )

  if (!resp.ok) return []

  const data = await resp.json()
  if (!data.ok) return []

  const messages: { text: string }[] = data.messages ?? []
  const target = messages.find((m) =>
    m.text.includes(`${issue}호 뉴스레터`) && m.text.includes("[제목]"),
  )

  if (!target) return []

  return parseArticleOrder(target.text)
}

const TYPE_MAP: Record<string, ArticleType> = {
  큐레이션: "curation",
  그레이: "gray",
  브랜디드: "branded",
}

export function parseArticleOrder(text: string): SlackOrderItem[] {
  const result: SlackOrderItem[] = []
  const orderStart = text.indexOf("[아티클 순서]")
  if (orderStart === -1) return result

  const lines = text.slice(orderStart).split("\n")
  let currentType: ArticleType = "curation"

  for (const line of lines) {
    const typeMatch = line.match(/^\*(.+?)\*$/)
    if (typeMatch) {
      const mapped = TYPE_MAP[typeMatch[1].trim()]
      if (mapped) currentType = mapped
      continue
    }

    const numMatch = line.match(/^\d+\.\s+(.+)/)
    if (numMatch) {
      result.push({ type: currentType, title: numMatch[1].trim() })
    }
  }

  return result
}

export function sortBySlackOrder<T extends { type: ArticleType; title: string }>(
  articles: T[],
  slackOrder: SlackOrderItem[],
): T[] {
  return articles.map((article) => {
    const idx = slackOrder.findIndex(
      (s) => s.type === article.type && (s.title === article.title || article.title.includes(s.title) || s.title.includes(article.title)),
    )
    return { article, idx: idx === -1 ? 999 : idx }
  })
    .sort((a, b) => a.idx - b.idx)
    .map(({ article }, i) => ({ ...article, order: i + 1 }))
}
