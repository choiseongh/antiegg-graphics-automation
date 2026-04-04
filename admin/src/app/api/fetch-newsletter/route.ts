import { NextRequest, NextResponse } from "next/server"
import { splitToTwoLines } from "@/lib/text-processing"

const SLACK_CHANNEL_ID = "C03CXG0P6A3" // 1-팀-콘텐츠

export async function POST(request: NextRequest) {
  try {
    const { issue } = await request.json()

    if (!issue) {
      return NextResponse.json({ error: "issue가 필요합니다." }, { status: 400 })
    }

    // Slack API로 채널 메시지 검색
    const slackToken = process.env.SLACK_BOT_TOKEN
    if (!slackToken) {
      return NextResponse.json({ error: "SLACK_BOT_TOKEN이 설정되지 않았습니다." }, { status: 500 })
    }

    // conversations.history로 채널 메시지 조회 (봇 토큰 호환)
    const historyResp = await fetch(
      `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}&limit=100`,
      { headers: { Authorization: `Bearer ${slackToken}` } },
    )

    if (!historyResp.ok) {
      return NextResponse.json({ error: "Slack API 호출 실패" }, { status: 500 })
    }

    const historyData = await historyResp.json()
    if (!historyData.ok) {
      return NextResponse.json({ error: `Slack 오류: ${historyData.error}` }, { status: 500 })
    }

    const messages: { text: string }[] = historyData.messages ?? []
    const targetMsg = messages.find((m) =>
      m.text.includes(`${issue}호 뉴스레터`) && m.text.includes("[제목]"),
    )

    if (!targetMsg) {
      return NextResponse.json({ error: `${issue}호 뉴스레터 메시지를 찾을 수 없습니다.` }, { status: 404 })
    }

    const parsed = parseNewsletterMessage(targetMsg.text)

    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function parseNewsletterMessage(text: string): { title: string; intro: string; publisher: string; articleOrder: string[] } {
  // 제목 추출: [제목] 이후 첫 번째 :egg: 줄
  let title = ""
  const titleSection = text.split("[제목]")[1] ?? ""
  const titleMatch = titleSection.match(/:egg:\s*(.+?)(?:\n|$)/)
  if (titleMatch) {
    title = titleMatch[1].trim()
  }

  // 서문 추출: [서문] 이후 ~ :books:[아티클 순서] 이전
  let intro = ""
  const introStart = text.indexOf("[서문]")
  const introEnd = text.indexOf("[아티클 순서]")

  if (introStart !== -1) {
    const introSection = introEnd !== -1
      ? text.slice(introStart, introEnd)
      : text.slice(introStart)

    // [서문] 첫 줄(페르소나 설명)을 제거하고 본문만 추출
    const introLines = introSection.split("\n")
    const bodyLines: string[] = []
    let foundFirstLine = false

    for (const line of introLines) {
      const cleaned = line.replace(/^(?:&gt;|>)\s*/, "").trim()
      if (!cleaned || cleaned.startsWith("[서문]")) continue

      // 첫 줄은 "ANTIEGG 페르소나..." 설명이므로 스킵
      if (!foundFirstLine) {
        if (cleaned.includes("ANTIEGG") && cleaned.includes("페르소나")) {
          foundFirstLine = true
          continue
        }
        // 페르소나 설명이 없는 경우도 처리
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

  // 아티클 순서 추출: [아티클 순서] 이후 번호 매겨진 항목들
  const articleOrder: string[] = []
  const orderStart = text.indexOf("[아티클 순서]")
  if (orderStart !== -1) {
    const orderSection = text.slice(orderStart)
    const lines = orderSection.split("\n")
    for (const line of lines) {
      const match = line.match(/^\d+\.\s+(.+)/)
      if (match) {
        articleOrder.push(match[1].trim())
      }
    }
  }

  const publisher = "형운"

  return { title: splitToTwoLines(title), intro, publisher, articleOrder }
}
