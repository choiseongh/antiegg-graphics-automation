import { NextRequest, NextResponse } from "next/server"
import { chromium } from "playwright"
import archiver from "archiver"
import { Readable } from "stream"
import path from "path"
import os from "os"
import fs from "fs"
import { renderStoryCover } from "@/templates/render-story-cover"
import { renderPostCover } from "@/templates/render-post-cover"
import { renderIntroPage } from "@/templates/render-intro-page"
import { renderNlPreviewCover } from "@/templates/render-nl-preview-cover"
import { renderNlPreviewIntro } from "@/templates/render-nl-preview-intro"
import { renderNlPreviewArticle } from "@/templates/render-nl-preview-article"
import { renderNlStoryCover } from "@/templates/render-nl-story-cover"
import { renderNlStoryList, splitArticlesIntoPages } from "@/templates/render-nl-story-list"
import { updateNotionStatus } from "@/lib/notion"
import type { EditArticle, NewsletterData } from "@/lib/types"

const TYPE_LABELS: Record<string, string> = {
  curation: "Curation",
  gray: "Gray",
  branded: "Branded",
}

const TYPE_NAMES_KR: Record<string, string> = {
  curation: "큐레이션",
  gray: "그레이",
  branded: "브랜디드",
}

interface ExportRequest {
  issue: number
  date: string
  articles: EditArticle[]
  newsletter?: NewsletterData
}

export async function POST(request: NextRequest) {
  let browser = null

  try {
    const body: ExportRequest = await request.json()
    const { issue, date, articles, newsletter } = body

    if (!issue || !articles?.length) {
      return NextResponse.json({ error: "issue와 articles가 필요합니다." }, { status: 400 })
    }

    const assetsDir = path.resolve(process.cwd(), "public/assets")
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antiegg-export-"))

    browser = await chromium.launch({ headless: true })

    const archive = archiver("zip", { zlib: { level: 6 } })
    const chunks: Buffer[] = []

    archive.on("data", (chunk: Buffer) => chunks.push(chunk))

    const archiveEnd = new Promise<void>((resolve, reject) => {
      archive.on("end", resolve)
      archive.on("error", reject)
    })

    for (const article of articles) {
      const typeKr = TYPE_NAMES_KR[article.type] ?? article.type
      const typeLabel = TYPE_LABELS[article.type] ?? article.type
      const prefix = `${typeKr} ${article.order}`

      const title2line = article.title2line || article.title
      const subtitle2line = article.subtitle2line || article.subtitle

      // 1. Story cover (1080x1920)
      const storyHtml = renderStoryCover({
        typeLabel,
        type: article.type,
        title2line,
        subtitle2line,
        heroImage: article.heroImage,
        imagePosition: article.imagePosition as "top" | "center" | "bottom" | undefined,
        mode: "export",
        exportAssetsPath: assetsDir,
      })
      const storyPng = await renderToPng(browser, storyHtml, 1080, 1920, tmpDir)
      archive.append(storyPng, { name: `${prefix}-1.png` })

      // 2. Post cover (1080x1350)
      const postHtml = renderPostCover({
        typeLabel,
        type: article.type,
        title2line,
        editor: article.editor,
        heroImage: article.heroImage,
        titlePosition: article.titlePosition,
        imagePosition: article.imagePosition as "top" | "center" | "bottom" | undefined,
        mode: "export",
        exportAssetsPath: assetsDir,
      })
      const postPng = await renderToPng(browser, postHtml, 1080, 1350, tmpDir)
      archive.append(postPng, { name: `${prefix}-2.png` })

      // 3. Intro pages
      const introPages = article.introPages.length > 0 ? article.introPages : ["", ""]
      for (let i = 0; i < introPages.length; i++) {
        const pageText = introPages[i]
        const paragraphs = pageText
          .split("\n\n")
          .filter(Boolean)
          .map((p) => p.replace(/\n/g, "<br>"))
        const introHtml = renderIntroPage({
          articleTitle: article.title,
          introParagraphs: paragraphs.length > 0 ? paragraphs : [""],
          mode: "export",
          exportAssetsPath: assetsDir,
        })
        const introPng = await renderToPng(browser, introHtml, 1080, 1350, tmpDir)
        archive.append(introPng, { name: `${prefix}-${i + 3}.png` })
      }
    }

    // 마지막장 고정 이미지 추가 (해당 유형 아티클이 1개 이상일 때)
    const LAST_PAGE_MAP: Record<string, string> = {
      curation: "큐레이션 마지막장.png",
      gray: "그레이 마지막장.png",
      branded: "브랜디드 마지막장.png",
    }
    const presentTypes = new Set(articles.map((a) => a.type as string))
    for (const [type, filename] of Object.entries(LAST_PAGE_MAP)) {
      if (!presentTypes.has(type)) continue
      const filePath = path.join(assetsDir, filename)
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: filename })
      }
    }

    // 뉴스레터 이미지 렌더링
    if (newsletter && newsletter.title) {
      const nlMode = { mode: "export" as const, exportAssetsPath: assetsDir }

      // 미리보기 1: 표지
      const nlCoverHtml = renderNlPreviewCover({ issue, title: newsletter.title, ...nlMode })
      const nlCoverPng = await renderToPng(browser, nlCoverHtml, 1080, 1350, tmpDir)
      archive.append(nlCoverPng, { name: "뉴스레터 미리보기-1.png" })

      // 미리보기 2: 서문
      const nlIntroHtml = renderNlPreviewIntro({ issue, intro: newsletter.intro, publisher: newsletter.publisher, ...nlMode })
      const nlIntroPng = await renderToPng(browser, nlIntroHtml, 1080, 1350, tmpDir)
      archive.append(nlIntroPng, { name: "뉴스레터 미리보기-2.png" })

      // 미리보기 3~N: 아티클 카드
      for (let i = 0; i < articles.length; i++) {
        const a = articles[i]
        const typeLabel = TYPE_LABELS[a.type] ?? a.type
        const nlArtHtml = renderNlPreviewArticle({
          issue, typeLabel, type: a.type, title: a.title, subtitle: a.subtitle, heroImage: a.heroImage, ...nlMode,
        })
        const nlArtPng = await renderToPng(browser, nlArtHtml, 1080, 1350, tmpDir)
        archive.append(nlArtPng, { name: `뉴스레터 미리보기-${i + 3}.png` })
      }

      // 미리보기 마지막장
      const nlLastPath = path.join(assetsDir, "뉴스레터 미리보기-마지막장.png")
      if (fs.existsSync(nlLastPath)) {
        archive.file(nlLastPath, { name: "뉴스레터 미리보기-마지막장.png" })
      }

      // 스토리 1: 표지
      const nlStoryCoverHtml = renderNlStoryCover({ issue, title: newsletter.title, intro: newsletter.intro, publisher: newsletter.publisher, ...nlMode })
      const nlStoryCoverPng = await renderToPng(browser, nlStoryCoverHtml, 1080, 1920, tmpDir)
      archive.append(nlStoryCoverPng, { name: "뉴스레터 미리보기 스토리-1.png" })

      // 스토리 2~N: 아티클 목록 (8개/장)
      const listItems = articles.map((a) => ({ typeLabel: TYPE_LABELS[a.type] ?? a.type, type: a.type, title: a.title }))
      const listPages = splitArticlesIntoPages(listItems)
      for (let i = 0; i < listPages.length; i++) {
        const nlListHtml = renderNlStoryList({ issue, articles: listPages[i], pageIndex: i, ...nlMode })
        const nlListPng = await renderToPng(browser, nlListHtml, 1080, 1920, tmpDir)
        archive.append(nlListPng, { name: `뉴스레터 미리보기 스토리-${i + 2}.png` })
      }
    }

    archive.finalize()
    await archiveEnd

    await browser.close()
    browser = null

    // Cleanup temp dir
    fs.rmSync(tmpDir, { recursive: true, force: true })

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
    if (browser) await browser.close()
    const message = error instanceof Error ? error.message : "Export 실패"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function renderToPng(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  html: string,
  width: number,
  height: number,
  tmpDir: string,
): Promise<Buffer> {
  const tmpFile = path.join(tmpDir, `render-${Date.now()}-${Math.random().toString(36).slice(2)}.html`)
  fs.writeFileSync(tmpFile, html, "utf-8")

  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(`file://${tmpFile}`, { waitUntil: "networkidle" })
  const screenshot = await page.screenshot({ fullPage: false })
  await page.close()

  fs.unlinkSync(tmpFile)
  return Buffer.from(screenshot)
}
