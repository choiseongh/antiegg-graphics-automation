const GHOST_URL = process.env.GHOST_URL ?? "https://square.antiegg.kr/ghost/api/content"
const GHOST_KEY = process.env.GHOST_KEY ?? ""

interface GhostPost {
  title: string
  slug: string
  custom_excerpt: string | null
  feature_image: string | null
  html: string
  authors: { name: string }[]
}

export function urlToSlug(url: string): string {
  const normalized = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`
  const path = new URL(normalized).pathname
  return path.replace(/^\/+|\/+$/g, "").split("/").pop() ?? ""
}

export async function fetchPostBySlug(slug: string): Promise<GhostPost | null> {
  if (!GHOST_KEY) {
    throw new Error("GHOST_KEY가 설정되지 않았습니다.")
  }

  const params = new URLSearchParams({
    key: GHOST_KEY,
    include: "authors,tags",
    formats: "html",
  })

  const resp = await fetch(`${GHOST_URL}/posts/slug/${slug}/?${params}`)

  if (!resp.ok) {
    if (resp.status === 404) return null
    throw new Error(`Ghost API 오류: ${resp.status} ${resp.statusText}`)
  }

  const data = await resp.json()
  const posts: GhostPost[] = data.posts ?? []
  return posts[0] ?? null
}

export function extractIntro(html: string): string {
  const stopTagPattern = /<(h2|h3|h4|hr)\b/i
  const pTagPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi

  const stopMatch = stopTagPattern.exec(html)
  const searchArea = stopMatch ? html.slice(0, stopMatch.index) : html

  const paragraphs: string[] = []
  let match: RegExpExecArray | null

  const regex = new RegExp(pTagPattern.source, pTagPattern.flags)
  while ((match = regex.exec(searchArea)) !== null) {
    const text = stripHtmlTags(match[1]).trim()
    if (text) paragraphs.push(text)
  }

  if (paragraphs.length === 0) {
    const fallbackRegex = new RegExp(pTagPattern.source, pTagPattern.flags)
    let count = 0
    while ((match = fallbackRegex.exec(html)) !== null && count < 3) {
      const text = stripHtmlTags(match[1]).trim()
      if (text) {
        paragraphs.push(text)
        count++
      }
    }
  }

  return paragraphs.join("\n")
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
