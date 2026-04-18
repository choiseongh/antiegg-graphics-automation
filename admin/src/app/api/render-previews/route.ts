import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { renderAllImages } from "@/lib/render-all-images"
import type { EditArticle, NewsletterData } from "@/lib/types"

interface Body {
  issue: number
  articles: EditArticle[]
  newsletter?: NewsletterData
}

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const body: Body = await request.json()
    const { issue, articles, newsletter } = body

    if (!issue || !articles?.length) {
      return NextResponse.json({ error: "issue, articles가 필요합니다." }, { status: 400 })
    }

    const assetsDir = path.resolve(process.cwd(), "public/assets")
    const rendered = await renderAllImages(
      { issue, articles, newsletter, assetsDir },
      { preview: true },
    )

    const previews = rendered.map((img) => ({
      name: img.name,
      width: img.width,
      height: img.height,
      dataUrl: `data:image/jpeg;base64,${img.buffer.toString("base64")}`,
    }))

    return NextResponse.json({ previews })
  } catch (error) {
    const message = error instanceof Error ? error.message : "미리보기 렌더링 실패"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
