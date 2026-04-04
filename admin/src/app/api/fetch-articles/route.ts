import { NextRequest, NextResponse } from "next/server"
import { fetchArticlesFromNotion, issueToDate } from "@/lib/notion"
import { fetchPostBySlug, urlToSlug, extractIntro } from "@/lib/ghost"
import { processText } from "@/lib/text-processing"
import { fetchSlackArticleOrder, sortBySlackOrder } from "@/lib/slack"
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

    const date = issueToDate(issue)
    const notionArticles = await fetchArticlesFromNotion(date)

    if (notionArticles.length === 0) {
      return NextResponse.json(
        { error: `발행일 ${date}에 해당하는 아티클이 없습니다.` },
        { status: 404 },
      )
    }
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
        editor: normalizeEditorName(post.authors?.[0]?.name ?? ""),
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

    // Slack 아티클 순서로 자동 정렬
    const slackOrder = await fetchSlackArticleOrder(issue)
    const sorted = slackOrder.length > 0 ? sortBySlackOrder(articles, slackOrder) : articles

    return NextResponse.json({ issue, date, articles: sorted })
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

const EDITOR_NAME_MAP: Record<string, string> = {
  Nile: "나일",
}

function normalizeEditorName(name: string): string {
  return EDITOR_NAME_MAP[name] ?? name
}
