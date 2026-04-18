import type { ArticleType, NewsletterData } from "./types"
import { splitToTwoLines } from "./text-processing"

const SLACK_CHANNEL_ID = "C03CXG0P6A3"

interface SlackOrderItem {
  type: ArticleType
  title: string
}

export async function fetchSlackIssueMessage(issue: number): Promise<string | null> {
  const slackToken = process.env.SLACK_BOT_TOKEN
  if (!slackToken) return null

  const resp = await fetch(
    `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}&limit=100`,
    { headers: { Authorization: `Bearer ${slackToken}` } },
  )

  if (!resp.ok) return null

  const data = await resp.json()
  if (!data.ok) return null

  const messages: { text: string }[] = data.messages ?? []
  const target = messages.find((m) =>
    m.text.includes(`${issue}호 뉴스레터`) && m.text.includes("[제목]"),
  )

  return target?.text ?? null
}

export async function fetchSlackArticleOrder(issue: number): Promise<SlackOrderItem[]> {
  const text = await fetchSlackIssueMessage(issue)
  return text ? parseArticleOrder(text) : []
}

export function parseNewsletterFields(text: string): NewsletterData {
  let title = ""
  const titleSection = text.split("[제목]")[1] ?? ""
  const titleMatch = titleSection.match(/:egg:\s*(.+?)(?:\n|$)/)
  if (titleMatch) {
    title = titleMatch[1].trim()
  }

  let intro = ""
  const introStart = text.indexOf("[서문]")
  const introEnd = text.indexOf("[아티클 순서]")

  if (introStart !== -1) {
    const introSection = introEnd !== -1
      ? text.slice(introStart, introEnd)
      : text.slice(introStart)

    const introLines = introSection.split("\n")
    const bodyLines: string[] = []
    let foundFirstLine = false

    for (const line of introLines) {
      const cleaned = line.replace(/^(?:&gt;|>)\s*/, "").trim()
      if (!cleaned || cleaned.startsWith("[서문]")) continue

      if (!foundFirstLine) {
        if (cleaned.includes("ANTIEGG") && cleaned.includes("페르소나")) {
          foundFirstLine = true
          continue
        }
        foundFirstLine = true
      }

      if (cleaned.startsWith(":books:")) break
      bodyLines.push(cleaned)
    }

    const joined = bodyLines.join(" ").trim()
    const lastSentenceMatch = joined.match(/^(.*[.!?…]\s*)([^.!?…]+[.!?…]*)$/)
    if (lastSentenceMatch && lastSentenceMatch[2].trim()) {
      intro = `${lastSentenceMatch[1]}**${lastSentenceMatch[2].trim()}**`
    } else {
      intro = joined
    }
  }

  return { title: splitToTwoLines(title), intro, publisher: "형운" }
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

export function normalizeTitle(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export function sortBySlackOrder<T extends { type: ArticleType; title: string; notionTitle?: string }>(
  articles: T[],
  slackOrder: SlackOrderItem[],
): (T & { slackOrderMatched: boolean })[] {
  return articles.map((article) => {
    const candidates = [article.title, article.notionTitle ?? ""]
      .filter(Boolean)
      .map(normalizeTitle)
    const idx = slackOrder.findIndex((s) => {
      if (s.type !== article.type) return false
      const slackTitle = normalizeTitle(s.title)
      return candidates.some(
        (c) => c === slackTitle || c.includes(slackTitle) || slackTitle.includes(c),
      )
    })
    return { article, idx: idx === -1 ? 999 : idx, matched: idx !== -1 }
  })
    .sort((a, b) => a.idx - b.idx)
    .map(({ article, matched }, i) => ({ ...article, order: i + 1, slackOrderMatched: matched }))
}
