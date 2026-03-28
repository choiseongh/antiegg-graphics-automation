import { NextRequest, NextResponse } from "next/server"
import { fetchArticlesFromNotion } from "@/lib/notion"
import { fetchPostBySlug, urlToSlug, extractIntro } from "@/lib/ghost"
import { processText } from "@/lib/text-processing"
import type { ArticleType, RawArticle } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const issue = Number(body.issue)

    if (!issue || issue <= 0) {
      return NextResponse.json(
        { error: "유효한 호수를 입력하세요." },
        { status: 400 },
      )
    }

    const notionArticles = await fetchArticlesFromNotion()

    if (notionArticles.length === 0) {
      return NextResponse.json(
        { error: "Notion에서 가져온 아티클이 없습니다. '수목금 / 그래픽 이미지 작업' 상태 아티클을 확인하세요." },
        { status: 404 },
      )
    }

    const date = notionArticles[0]?.date ?? ""
    const articles: RawArticle[] = []
    const typeCounters: Record<string, number> = {}

    for (let i = 0; i < notionArticles.length; i++) {
      const notionArt = notionArticles[i]
      const slug = urlToSlug(notionArt.url)
      const post = await fetchPostBySlug(slug)

      if (!post) continue

      const artType = notionArt.type
      typeCounters[artType] = (typeCounters[artType] ?? 0) + 1

      const introRaw = extractIntro(post.html ?? "")

      const title = post.title ?? ""
      const subtitle = post.custom_excerpt ?? ""
      const processed = processText(introRaw, title, subtitle)

      articles.push({
        no: i + 1,
        type: artType,
        order: typeCounters[artType],
        slug,
        title,
        subtitle,
        editor: post.authors?.[0]?.name ?? "",
        heroImage: post.feature_image ?? "",
        introRaw,
        introCharCount: introRaw.length,
        titlePosition: "bottom",
        title2line: processed.title2line,
        subtitle2line: processed.subtitle2line,
        introPages: processed.introPages,
      })
    }

    if (articles.length === 0) {
      return NextResponse.json(
        { error: "Ghost에서 아티클 데이터를 가져올 수 없습니다." },
        { status: 404 },
      )
    }

    return NextResponse.json({ issue, date, articles })
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
