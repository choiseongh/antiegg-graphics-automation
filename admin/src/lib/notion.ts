import type { ArticleType, NotionArticle } from "./types"

const NOTION_API_KEY = process.env.NOTION_API_KEY ?? ""
const NOTION_DB_ID = process.env.NOTION_DB_ID ?? ""
const NOTION_STATUS_FILTER = "수목금 / 그래픽 이미지 작업"

const TYPE_MAP: Record<string, ArticleType> = {
  CURATION: "curation",
  GRAY: "gray",
  BRANDED: "branded",
  INSPIRATION: "curation",
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed.startsWith("http")) {
    return `https://${trimmed}`.replace(/\/+$/, "")
  }
  return trimmed.replace(/\/+$/, "")
}

export async function fetchArticlesFromNotion(): Promise<NotionArticle[]> {
  if (!NOTION_API_KEY) {
    throw new Error("NOTION_API_KEY가 설정되지 않았습니다.")
  }

  const resp = await fetch(
    `https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          property: "상태",
          select: { equals: NOTION_STATUS_FILTER },
        },
      }),
    },
  )

  if (!resp.ok) {
    throw new Error(`Notion API 오류: ${resp.status} ${resp.statusText}`)
  }

  const data = await resp.json()
  const results: unknown[] = data.results ?? []
  const articles: NotionArticle[] = []

  for (const r of results) {
    const page = r as {
      id: string
      properties: Record<string, unknown>
    }
    const props = page.properties

    const titleArr = (props["아티클 제목"] as { title?: { plain_text: string }[] })?.title ?? []
    const title = titleArr[0]?.plain_text ?? ""

    const cmsUrl = (props["Square CMS"] as { url?: string })?.url ?? ""
    const ctSelect = (props["🔴 콘텐츠 종류"] as { select?: { name: string } })?.select
    const ctName = ctSelect?.name ?? ""
    const pubDate = (props["발행일"] as { date?: { start: string } })?.date
    const dateStr = pubDate?.start ?? ""

    if (!cmsUrl) continue

    articles.push({
      url: normalizeUrl(cmsUrl),
      type: TYPE_MAP[ctName.toUpperCase()] ?? (ctName.toLowerCase() as ArticleType),
      notionTitle: title,
      date: dateStr,
      pageId: page.id,
    })
  }

  return articles
}

export async function updateNotionStatus(pageId: string, newStatus: string): Promise<void> {
  await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        "상태": { select: { name: newStatus } },
      },
    }),
  })
}
