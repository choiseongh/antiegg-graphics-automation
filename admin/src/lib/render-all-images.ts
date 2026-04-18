import type { Browser } from "playwright"
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
import type { EditArticle, NewsletterData } from "@/lib/types"

export const TYPE_LABELS: Record<string, string> = {
  curation: "Curation",
  gray: "Gray",
  branded: "Branded",
}

export const TYPE_NAMES_KR: Record<string, string> = {
  curation: "큐레이션",
  gray: "그레이",
  branded: "브랜디드",
}

export const LAST_PAGE_FILES: Record<string, string> = {
  curation: "큐레이션 마지막장.png",
  gray: "그레이 마지막장.png",
  branded: "브랜디드 마지막장.png",
}

export interface RenderedImage {
  name: string
  buffer: Buffer
  width: number
  height: number
}

export interface RenderOptions {
  preview?: boolean
  onProgress?: (current: number, total: number, label: string) => void
}

export async function downloadImage(url: string, tmpDir: string): Promise<string> {
  if (!url || url.startsWith("data:") || url.startsWith("file:")) return url
  try {
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
    if (!resp.ok) return url
    const buf = Buffer.from(await resp.arrayBuffer())
    const ext = (resp.headers.get("content-type") ?? "image/jpeg").includes("png") ? "png" : "jpg"
    const localPath = path.join(tmpDir, `hero-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`)
    fs.writeFileSync(localPath, buf)
    return `file://${localPath}`
  } catch {
    return url
  }
}

async function renderHtmlToBuffer(
  browser: Browser,
  html: string,
  width: number,
  height: number,
  tmpDir: string,
  opts: RenderOptions,
): Promise<Buffer> {
  const scale = opts.preview ? 360 / width : 1
  const tmpFile = path.join(tmpDir, `render-${Date.now()}-${Math.random().toString(36).slice(2)}.html`)
  fs.writeFileSync(tmpFile, html, "utf-8")
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: scale,
  })
  await page.goto(`file://${tmpFile}`, { waitUntil: "networkidle" })
  const screenshot = await page.screenshot({
    fullPage: false,
    type: opts.preview ? "jpeg" : "png",
    quality: opts.preview ? 72 : undefined,
  })
  await page.close()
  fs.unlinkSync(tmpFile)
  return Buffer.from(screenshot)
}

export interface RenderInput {
  issue: number
  articles: EditArticle[]
  newsletter?: NewsletterData
  assetsDir: string
}

export async function renderAllImages(
  input: RenderInput,
  opts: RenderOptions = {},
): Promise<RenderedImage[]> {
  const { issue, articles, newsletter, assetsDir } = input
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antiegg-render-"))
  const { chromium } = await import("playwright")
  const browser: Browser = await chromium.launch({ headless: true })

  const results: RenderedImage[] = []
  const totalEstimate = estimateTotal(articles, newsletter)
  let progressCounter = 0
  const tick = (label: string) => {
    progressCounter += 1
    opts.onProgress?.(progressCounter, totalEstimate, label)
  }

  try {
    for (const article of articles) {
      const typeKr = TYPE_NAMES_KR[article.type] ?? article.type
      const typeLabel = TYPE_LABELS[article.type] ?? article.type
      const prefix = `${typeKr} ${article.order}`
      const heroLocal = await downloadImage(article.heroImage, tmpDir)

      const title2line = article.title2line || article.title
      const postTitle2line = article.postTitle2line || title2line
      const subtitle2line = article.subtitle2line || article.subtitle

      const storyHtml = renderStoryCover({
        typeLabel, type: article.type, title2line, subtitle2line,
        heroImage: heroLocal,
        imagePosition: article.imagePositions?.story?.y,
        imagePositionX: article.imagePositions?.story?.x,
        mode: "export", exportAssetsPath: assetsDir,
      })
      results.push({ name: `${prefix}-1.png`, buffer: await renderHtmlToBuffer(browser, storyHtml, 1080, 1920, tmpDir, opts), width: 1080, height: 1920 })
      tick(`${prefix}-1`)

      const postHtml = renderPostCover({
        typeLabel, type: article.type, title2line: postTitle2line,
        editor: article.editor, heroImage: heroLocal, titlePosition: article.titlePosition,
        imagePosition: article.imagePositions?.post?.y,
        imagePositionX: article.imagePositions?.post?.x,
        mode: "export", exportAssetsPath: assetsDir,
      })
      results.push({ name: `${prefix}-2.png`, buffer: await renderHtmlToBuffer(browser, postHtml, 1080, 1350, tmpDir, opts), width: 1080, height: 1350 })
      tick(`${prefix}-2`)

      const introPages = article.introPages.length > 0 ? article.introPages : ["", ""]
      for (let i = 0; i < introPages.length; i++) {
        const paragraphs = introPages[i]
          .split("\n\n")
          .filter(Boolean)
          .map((p) => p.replace(/\n/g, "<br>"))
        const introHtml = renderIntroPage({
          articleTitle: article.introTitle || article.title,
          introParagraphs: paragraphs.length > 0 ? paragraphs : [""],
          mode: "export", exportAssetsPath: assetsDir,
        })
        results.push({ name: `${prefix}-${i + 3}.png`, buffer: await renderHtmlToBuffer(browser, introHtml, 1080, 1350, tmpDir, opts), width: 1080, height: 1350 })
        tick(`${prefix}-${i + 3}`)
      }
    }

    const presentTypes = new Set(articles.map((a) => a.type as string))
    for (const [type, filename] of Object.entries(LAST_PAGE_FILES)) {
      if (!presentTypes.has(type)) continue
      const filePath = path.join(assetsDir, filename)
      if (!fs.existsSync(filePath)) continue
      const buf = fs.readFileSync(filePath)
      results.push({ name: filename, buffer: buf, width: 1080, height: 1350 })
      tick(filename)
    }

    if (newsletter && newsletter.title) {
      const nlMode = { mode: "export" as const, exportAssetsPath: assetsDir }

      const nlCoverHtml = renderNlPreviewCover({ issue, title: newsletter.title, ...nlMode })
      results.push({ name: "뉴스레터 미리보기-1.png", buffer: await renderHtmlToBuffer(browser, nlCoverHtml, 1080, 1350, tmpDir, opts), width: 1080, height: 1350 })
      tick("뉴스레터 미리보기-1")

      const nlIntroHtml = renderNlPreviewIntro({ issue, intro: newsletter.intro, publisher: newsletter.publisher, ...nlMode })
      results.push({ name: "뉴스레터 미리보기-2.png", buffer: await renderHtmlToBuffer(browser, nlIntroHtml, 1080, 1350, tmpDir, opts), width: 1080, height: 1350 })
      tick("뉴스레터 미리보기-2")

      for (let i = 0; i < articles.length; i++) {
        const a = articles[i]
        const aTypeLabel = TYPE_LABELS[a.type] ?? a.type
        const nlHero = await downloadImage(a.heroImage, tmpDir)
        const nlArtHtml = renderNlPreviewArticle({
          issue, typeLabel: aTypeLabel, type: a.type,
          title: a.nlTitle2line || a.title2line || a.title,
          subtitle: a.subtitle, heroImage: nlHero,
          imagePosition: a.imagePositions?.["nl-preview"]?.y,
          imagePositionX: a.imagePositions?.["nl-preview"]?.x,
          ...nlMode,
        })
        results.push({ name: `뉴스레터 미리보기-${i + 3}.png`, buffer: await renderHtmlToBuffer(browser, nlArtHtml, 1080, 1350, tmpDir, opts), width: 1080, height: 1350 })
        tick(`뉴스레터 미리보기-${i + 3}`)
      }

      const nlLastPath = path.join(assetsDir, "뉴스레터 미리보기-마지막장.png")
      if (fs.existsSync(nlLastPath)) {
        results.push({ name: "뉴스레터 미리보기-마지막장.png", buffer: fs.readFileSync(nlLastPath), width: 1080, height: 1350 })
        tick("뉴스레터 미리보기-마지막장")
      }

      const nlStoryCoverHtml = renderNlStoryCover({ issue, title: newsletter.title, intro: newsletter.intro, publisher: newsletter.publisher, ...nlMode })
      results.push({ name: "뉴스레터 미리보기 스토리-1.png", buffer: await renderHtmlToBuffer(browser, nlStoryCoverHtml, 1080, 1920, tmpDir, opts), width: 1080, height: 1920 })
      tick("뉴스레터 미리보기 스토리-1")

      const listItems = articles.map((a) => ({ typeLabel: TYPE_LABELS[a.type] ?? a.type, type: a.type, title: a.title }))
      const listPages = splitArticlesIntoPages(listItems)
      for (let i = 0; i < listPages.length; i++) {
        const nlListHtml = renderNlStoryList({ issue, articles: listPages[i], pageIndex: i, ...nlMode })
        results.push({ name: `뉴스레터 미리보기 스토리-${i + 2}.png`, buffer: await renderHtmlToBuffer(browser, nlListHtml, 1080, 1920, tmpDir, opts), width: 1080, height: 1920 })
        tick(`뉴스레터 미리보기 스토리-${i + 2}`)
      }
    }

    return results
  } finally {
    await browser.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

function estimateTotal(articles: EditArticle[], newsletter?: NewsletterData): number {
  let total = 0
  for (const a of articles) {
    const intros = a.introPages.length > 0 ? a.introPages.length : 2
    total += 2 + intros
  }
  const typeCount = new Set(articles.map((a) => a.type)).size
  total += typeCount
  if (newsletter && newsletter.title) {
    total += 2
    total += articles.length
    total += 1
    total += 1
    const listPageCount = Math.max(1, Math.ceil(articles.length / 8))
    total += listPageCount
  }
  return total
}
