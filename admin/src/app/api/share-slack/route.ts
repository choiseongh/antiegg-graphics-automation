import { NextRequest, NextResponse } from "next/server"
import path from "path"
import archiver from "archiver"
import { renderAllImages } from "@/lib/render-all-images"
import { buildSharePlan } from "@/lib/share-plan"
import { getSlackUsers } from "@/lib/slack-users-cache"
import { resolveEditors } from "@/lib/editor-map"
import {
  postMessage,
  uploadFilesToThread,
  getPermalink,
  verifyChannelMembership,
} from "@/lib/slack-share"
import type { EditArticle, NewsletterData } from "@/lib/types"

const PROD_CHANNEL_ID = "C03DCFTULG5"
const RECIPIENTS = {
  primary: "U03CXG0SAP9",
  cc: ["U03DF6UL0P5", "U03D0JK7FEK"],
}

interface Body {
  issue: number
  date: string
  articles: EditArticle[]
  newsletter?: NewsletterData
}

export const maxDuration = 600

export async function POST(request: NextRequest) {
  try {
    const body: Body = await request.json()
    const { issue, date, articles, newsletter } = body

    if (!issue || !date || !articles?.length) {
      return NextResponse.json({ error: "issue, date, articles가 필요합니다." }, { status: 400 })
    }

    const channel = resolveTargetChannel()
    const isDm = channel.startsWith("U") || channel.startsWith("W")

    if (!isDm) {
      const isMember = await verifyChannelMembership(channel)
      if (!isMember) {
        return NextResponse.json(
          { error: `봇이 채널 ${channel}의 멤버가 아닙니다. Slack에서 봇을 초대해 주세요.` },
          { status: 412 },
        )
      }
    }

    const assetsDir = path.resolve(process.cwd(), "public/assets")
    const rendered = await renderAllImages({ issue, articles, newsletter, assetsDir })

    const slackUsers = await getSlackUsers()
    const editors = articles.map((a) => a.editor)
    const { resolved, unmatched } = resolveEditors(editors, slackUsers)

    const plan = buildSharePlan({
      issue,
      date,
      articles: articles.map((a) => ({ type: a.type, order: a.order, editor: a.editor })),
      recipients: RECIPIENTS,
      editorResolvedIds: resolved,
      unmatchedEditors: unmatched,
      renderedImages: rendered,
    })

    const zipBuffer = await buildZipBuffer(rendered)

    const parent = await postMessage(channel, plan.parentText)
    const resolvedChannel = parent.channel

    try {
      await uploadFilesToThread(resolvedChannel, parent.ts, [
        { filename: plan.zipFilename, buffer: zipBuffer },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await safePostReply(resolvedChannel, parent.ts, `⚠ ZIP 업로드 실패: ${msg}`)
      const permalink = await getPermalink(resolvedChannel, parent.ts)
      return NextResponse.json(
        { ok: false, error: "ZIP 업로드 실패", permalink, threadTs: parent.ts, channel: resolvedChannel, failedAt: "zip" },
        { status: 207 },
      )
    }

    for (let i = 0; i < plan.batches.length; i++) {
      const batch = plan.batches[i]
      const files = batch.files.map((f) => ({ filename: f.name, buffer: f.buffer }))
      try {
        await uploadFilesToThread(resolvedChannel, parent.ts, files)
        await sleep(200)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await safePostReply(
          resolvedChannel,
          parent.ts,
          `⚠ 배치 ${i + 1}/${plan.batches.length} (${batch.label}) 업로드 실패: ${msg}`,
        )
        const permalink = await getPermalink(resolvedChannel, parent.ts)
        return NextResponse.json(
          {
            ok: false,
            error: `배치 ${i + 1}/${plan.batches.length} 업로드 실패: ${msg}`,
            permalink,
            threadTs: parent.ts,
            channel: resolvedChannel,
            failedAt: `batch-${i + 1}`,
            batchLabel: batch.label,
            completedBatches: i,
          },
          { status: 207 },
        )
      }
    }

    await postMessage(resolvedChannel, plan.finalMessage, parent.ts)

    const permalink = await getPermalink(resolvedChannel, parent.ts)

    return NextResponse.json({
      ok: true,
      permalink,
      threadTs: parent.ts,
      channel: resolvedChannel,
      unmatched,
      totalImages: rendered.length,
      batchCount: plan.batches.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "공유 실패"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function resolveTargetChannel(): string {
  const override = process.env.SLACK_SHARE_CHANNEL_ID?.trim()
  return override || PROD_CHANNEL_ID
}

async function buildZipBuffer(images: { name: string; buffer: Buffer }[]): Promise<Buffer> {
  const archive = archiver("zip", { zlib: { level: 6 } })
  const chunks: Buffer[] = []
  archive.on("data", (c: Buffer) => chunks.push(c))
  const done = new Promise<void>((resolve, reject) => {
    archive.on("end", resolve)
    archive.on("error", reject)
  })
  for (const img of images) {
    archive.append(img.buffer, { name: img.name })
  }
  archive.finalize()
  await done
  return Buffer.concat(chunks)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function safePostReply(channel: string, thread_ts: string, text: string): Promise<void> {
  try {
    await postMessage(channel, text, thread_ts)
  } catch {
    // 실패 마커 전송도 실패하면 조용히 삼킨다 — 주 에러는 상위에서 반환됨
  }
}
