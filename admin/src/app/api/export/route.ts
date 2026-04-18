import { NextRequest, NextResponse } from "next/server"
import archiver from "archiver"
import path from "path"
import { renderAllImages } from "@/lib/render-all-images"
import type { EditArticle, NewsletterData } from "@/lib/types"

interface ExportRequest {
  issue: number
  date: string
  articles: EditArticle[]
  newsletter?: NewsletterData
}

export const maxDuration = 600

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json()
    const { issue, date, articles, newsletter } = body

    if (!issue || !articles?.length) {
      return NextResponse.json({ error: "issue와 articles가 필요합니다." }, { status: 400 })
    }

    const assetsDir = path.resolve(process.cwd(), "public/assets")
    const rendered = await renderAllImages({ issue, articles, newsletter, assetsDir })

    const archive = archiver("zip", { zlib: { level: 6 } })
    const chunks: Buffer[] = []
    archive.on("data", (chunk: Buffer) => chunks.push(chunk))
    const archiveEnd = new Promise<void>((resolve, reject) => {
      archive.on("end", resolve)
      archive.on("error", reject)
    })

    for (const img of rendered) {
      archive.append(img.buffer, { name: img.name })
    }
    archive.finalize()
    await archiveEnd

    const zipBuffer = Buffer.concat(chunks)
    const filename = `${issue}호_${date}.zip`
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export 실패"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
