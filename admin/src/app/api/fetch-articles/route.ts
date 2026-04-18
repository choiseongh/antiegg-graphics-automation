import { NextRequest, NextResponse } from "next/server"
import { fetchArticlesFromNotion, issueToDate } from "@/lib/notion"
import { fetchPostBySlug, urlToSlug, extractIntro, extractFirstImage } from "@/lib/ghost"
import { processText } from "@/lib/text-processing"
import { fetchSlackIssueMessage, parseArticleOrder, parseNewsletterFields, sortBySlackOrder } from "@/lib/slack"
import type { ArticleType, NewsletterData, RawArticle } from "@/lib/types"

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

      const ghostTitle = post.title ?? ""
      const title = notionArt.notionTitle || ghostTitle
      const subtitle = post.custom_excerpt ?? ""
      const processed = processText(introRaw, title, subtitle)

      articles.push({
        no: i + 1,
        type: artType,
        order: typeCounters[artType],
        slug,
        title,
        notionTitle: notionArt.notionTitle,
        subtitle,
        editor: normalizeEditorName(post.authors?.[0]?.name ?? ""),
        heroImage: post.feature_image || extractFirstImage(post.html ?? ""),
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

    // Slack 메시지 1회 조회로 아티클 순서 + 뉴스레터 필드 동시 파싱
    const slackText = await fetchSlackIssueMessage(issue)
    const slackOrder = slackText ? parseArticleOrder(slackText) : []
    const newsletter: NewsletterData | null = slackText ? parseNewsletterFields(slackText) : null
    const sorted = slackOrder.length > 0 ? sortBySlackOrder(articles, slackOrder) : articles

    return NextResponse.json({ issue, date, articles: sorted, newsletter })
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
