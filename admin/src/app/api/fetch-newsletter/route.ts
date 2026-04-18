import { NextRequest, NextResponse } from "next/server"
import { fetchSlackIssueMessage, parseNewsletterFields } from "@/lib/slack"

export async function POST(request: NextRequest) {
  try {
    const { issue } = await request.json()

    if (!issue) {
      return NextResponse.json({ error: "issue가 필요합니다." }, { status: 400 })
    }

    if (!process.env.SLACK_BOT_TOKEN) {
      return NextResponse.json({ error: "SLACK_BOT_TOKEN이 설정되지 않았습니다." }, { status: 500 })
    }

    const text = await fetchSlackIssueMessage(issue)
    if (!text) {
      return NextResponse.json({ error: `${issue}호 뉴스레터 메시지를 찾을 수 없습니다.` }, { status: 404 })
    }

    const fields = parseNewsletterFields(text)
    const articleOrder = parseArticleOrderTitles(text)

    return NextResponse.json({ ...fields, articleOrder })
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function parseArticleOrderTitles(text: string): string[] {
  const result: string[] = []
  const orderStart = text.indexOf("[아티클 순서]")
  if (orderStart === -1) return result

  const lines = text.slice(orderStart).split("\n")
  for (const line of lines) {
    const match = line.match(/^\d+\.\s+(.+)/)
    if (match) result.push(match[1].trim())
  }
  return result
}
