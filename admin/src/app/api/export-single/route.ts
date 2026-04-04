import { NextRequest, NextResponse } from "next/server"
import { chromium } from "playwright"
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

interface SingleExportRequest {
  article?: {
    type: string
    order: number
    title: string
    title2line: string
    postTitle2line?: string
    nlTitle2line?: string
    introTitle?: string
    subtitle: string
    subtitle2line: string
    editor: string
    heroImage: string
    titlePosition: "top" | "bottom"
    imagePositions?: Record<string, { y: string; x: string }>
    introPages: string[]
  }
  cardType: string
  introIndex?: number
  nlData?: {
    issue: number
    newsletter: { title: string; intro: string; publisher: string }
    articleIndex?: number
    listPageIndex?: number
    lastPageFilename?: string
    articles?: { type: string; order: number; title: string; subtitle: string; heroImage: string; imagePosition?: string }[]
  }
}

async function downloadImage(url: string, tmpDir: string): Promise<string> {
  if (!url || url.startsWith("data:") || url.startsWith("file:")) return url
  try {
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
    if (!resp.ok) return url
    const buf = Buffer.from(await resp.arrayBuffer())
    const ext = (resp.headers.get("content-type") ?? "image/jpeg").includes("png") ? "png" : "jpg"
    const localPath = path.join(tmpDir, `hero-${Date.now()}.${ext}`)
    fs.writeFileSync(localPath, buf)
    return `file://${localPath}`
  } catch {
    return url
  }
}

export async function POST(request: NextRequest) {
  let browser = null

  try {
    const body: SingleExportRequest = await request.json()
    const { article, cardType, introIndex } = body

    const assetsDir = path.resolve(process.cwd(), "public/assets")
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antiegg-single-"))
    const typeLabel = article ? (TYPE_LABELS[article.type] ?? article.type) : ""
    const typeKr = article ? (TYPE_NAMES_KR[article.type] ?? article.type) : ""
    const title2line = article ? (article.title2line || article.title) : ""
    const postTitle2line = article ? (article.postTitle2line || title2line) : ""
    const nlTitle2line = article ? (article.nlTitle2line || title2line) : ""
    const subtitle2line = article ? (article.subtitle2line || article.subtitle) : ""

    let html: string
    let width: number
    let height: number
    let filename: string

    switch (cardType) {
      case "story": {
        if (!article) return NextResponse.json({ error: "article required" }, { status: 400 })
        const storyHero = await downloadImage(article.heroImage, tmpDir)
        html = renderStoryCover({
          typeLabel, type: article.type, title2line, subtitle2line,
          heroImage: storyHero, imagePosition: article.imagePositions?.story?.y as "top"|"center"|"bottom"|undefined, imagePositionX: article.imagePositions?.story?.x as "left"|"center"|"right"|undefined, mode: "export", exportAssetsPath: assetsDir,
        })
        width = 1080; height = 1920
        filename = `${typeKr} ${article.order}-1.png`
        break
      }
      case "post": {
        if (!article) return NextResponse.json({ error: "article required" }, { status: 400 })
        const postHero = await downloadImage(article.heroImage, tmpDir)
        html = renderPostCover({
          typeLabel, type: article.type, title2line: postTitle2line, editor: article.editor,
          heroImage: postHero, titlePosition: article.titlePosition,
          imagePosition: article.imagePositions?.post?.y as "top"|"center"|"bottom"|undefined, imagePositionX: article.imagePositions?.post?.x as "left"|"center"|"right"|undefined,
          mode: "export", exportAssetsPath: assetsDir,
        })
        width = 1080; height = 1350
        filename = `${typeKr} ${article.order}-2.png`
        break
      }
      case "intro": {
        if (!article) return NextResponse.json({ error: "article required" }, { status: 400 })
        const idx = introIndex ?? 0
        const pageText = article.introPages[idx] ?? ""
        const paragraphs = pageText.split("\n\n").filter(Boolean).map((p) => p.replace(/\n/g, "<br>"))
        html = renderIntroPage({
          articleTitle: article.introTitle || article.title,
          introParagraphs: paragraphs.length > 0 ? paragraphs : [""],
          mode: "export", exportAssetsPath: assetsDir,
        })
        width = 1080; height = 1350
        filename = `${typeKr} ${article.order}-${idx + 3}.png`
        break
      }
      case "last-page":
      case "nl-last-page": {
        const lpFilename = body.nlData?.lastPageFilename
        if (!lpFilename) return NextResponse.json({ error: "lastPageFilename required" }, { status: 400 })
        const lpPath = path.join(assetsDir, lpFilename)
        if (!fs.existsSync(lpPath)) return NextResponse.json({ error: `파일 없음: ${lpFilename}` }, { status: 404 })
        const lpBuffer = fs.readFileSync(lpPath)
        const encodedLp = encodeURIComponent(lpFilename)
        fs.rmSync(tmpDir, { recursive: true, force: true })
        return new NextResponse(lpBuffer, {
          headers: {
            "Content-Type": "image/png",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodedLp}`,
          },
        })
      }
      case "nl-cover": {
        if (!body.nlData) return NextResponse.json({ error: "nlData required" }, { status: 400 })
        html = renderNlPreviewCover({ issue: body.nlData.issue, title: body.nlData.newsletter.title, mode: "export", exportAssetsPath: assetsDir })
        width = 1080; height = 1350
        filename = "뉴스레터 미리보기-1.png"
        break
      }
      case "nl-intro": {
        if (!body.nlData) return NextResponse.json({ error: "nlData required" }, { status: 400 })
        html = renderNlPreviewIntro({ issue: body.nlData.issue, intro: body.nlData.newsletter.intro, publisher: body.nlData.newsletter.publisher, mode: "export", exportAssetsPath: assetsDir })
        width = 1080; height = 1350
        filename = "뉴스레터 미리보기-2.png"
        break
      }
      case "nl-article": {
        if (!body.nlData || !article) return NextResponse.json({ error: "nlData and article required" }, { status: 400 })
        const aTypeLabel = TYPE_LABELS[article.type] ?? article.type
        const nlHero = await downloadImage(article.heroImage, tmpDir)
        html = renderNlPreviewArticle({ issue: body.nlData.issue, typeLabel: aTypeLabel, type: article.type, title: article.nlTitle2line || article.title2line || article.title, subtitle: article.subtitle, heroImage: nlHero, imagePosition: article.imagePositions?.["nl-preview"]?.y as "top"|"center"|"bottom"|undefined, imagePositionX: article.imagePositions?.["nl-preview"]?.x as "left"|"center"|"right"|undefined, mode: "export", exportAssetsPath: assetsDir })
        width = 1080; height = 1350
        filename = `뉴스레터 미리보기-${(body.nlData.articleIndex ?? 0) + 3}.png`
        break
      }
      case "nl-story-cover": {
        if (!body.nlData) return NextResponse.json({ error: "nlData required" }, { status: 400 })
        html = renderNlStoryCover({ issue: body.nlData.issue, title: body.nlData.newsletter.title, intro: body.nlData.newsletter.intro, publisher: body.nlData.newsletter.publisher, mode: "export", exportAssetsPath: assetsDir })
        width = 1080; height = 1920
        filename = "뉴스레터 미리보기 스토리-1.png"
        break
      }
      case "nl-story-list": {
        if (!body.nlData?.articles) return NextResponse.json({ error: "nlData.articles required" }, { status: 400 })
        const listItems = body.nlData.articles.map((a) => ({ typeLabel: TYPE_LABELS[a.type] ?? a.type, type: a.type, title: a.title }))
        const pages = splitArticlesIntoPages(listItems)
        const pi = body.nlData.listPageIndex ?? 0
        html = renderNlStoryList({ issue: body.nlData.issue, articles: pages[pi] ?? [], pageIndex: pi, mode: "export", exportAssetsPath: assetsDir })
        width = 1080; height = 1920
        filename = `뉴스레터 미리보기 스토리-${pi + 2}.png`
        break
      }
      default:
        return NextResponse.json({ error: "Invalid cardType" }, { status: 400 })
    }

    browser = await chromium.launch({ headless: true })
    const tmpFile = path.join(tmpDir, "render.html")
    fs.writeFileSync(tmpFile, html, "utf-8")

    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto(`file://${tmpFile}`, { waitUntil: "networkidle" })
    const screenshot = await page.screenshot({ fullPage: false })
    await page.close()
    await browser.close()
    browser = null

    fs.rmSync(tmpDir, { recursive: true, force: true })

    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(Buffer.from(screenshot), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (error) {
    if (browser) await browser.close()
    const message = error instanceof Error ? error.message : "Export 실패"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
