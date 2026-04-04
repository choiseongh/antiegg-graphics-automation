import type { ProcessTextResponse } from "./types"
import { extractCoreIntro } from "./extract-core-intro"

/**
 * 서문 분할 + 제목/부제목 2줄 분할 (규칙 기반)
 *
 * 규칙:
 * - 300자 이하 → 2페이지, 350자 이상 → 3페이지, 300~350자 → 자연스러운 쪽
 * - 문장 경계(마침표/물음표/느낌표)에서만 분할
 * - 페이지당 130~170자 목표 (평균 150자)
 * - 문장 삭제/요약/순서 변경 절대 금지
 */
export function processText(
  introRaw: string,
  title: string,
  subtitle: string,
): ProcessTextResponse {
  const coreIntro = extractCoreIntro(introRaw)
  return {
    introPages: splitIntro(coreIntro),
    title2line: splitToTwoLines(title),
    subtitle2line: splitToTwoLines(subtitle),
  }
}

function splitIntoSentences(text: string): string[] {
  const sentences: string[] = []
  const pattern = /[^.!?…]+[.!?…]+/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const s = match[0].trim()
    if (s) sentences.push(s)
  }

  if (sentences.length === 0 && text.trim()) {
    sentences.push(text.trim())
  }

  const joined = sentences.join(" ")
  const remaining = text.slice(joined.length).trim()
  if (remaining) {
    sentences.push(remaining)
  }

  return sentences
}

function splitIntro(introRaw: string): string[] {
  if (!introRaw.trim()) return [""]

  const paragraphs = introRaw.split("\n").filter((p) => p.trim())
  const allSentences: string[] = []

  for (const para of paragraphs) {
    const sentences = splitIntoSentences(para)
    allSentences.push(...sentences)
  }

  if (allSentences.length === 0) return [introRaw]

  const totalLength = allSentences.reduce((sum, s) => sum + s.length, 0)
  const pageCount = decidePageCount(totalLength)

  return distributeToPages(allSentences, pageCount)
}

function decidePageCount(charCount: number): number {
  if (charCount <= 300) return 2
  if (charCount >= 350) return 3
  return charCount <= 325 ? 2 : 3
}

function distributeToPages(sentences: string[], pageCount: number): string[] {
  if (sentences.length <= pageCount) {
    return sentences.map((s) => s)
  }

  const totalLength = sentences.reduce((sum, s) => sum + s.length, 0)
  const targetPerPage = totalLength / pageCount

  const pages: string[] = []
  let currentPage: string[] = []
  let currentLength = 0

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    currentPage.push(sentence)
    currentLength += sentence.length

    const isLastSentence = i === sentences.length - 1
    const remainingPages = pageCount - pages.length - 1

    if (!isLastSentence && remainingPages > 0) {
      const shouldSplit = currentLength >= targetPerPage * 0.75
      const remainingSentences = sentences.length - i - 1

      if (shouldSplit && remainingSentences >= remainingPages) {
        pages.push(formatPage(currentPage))
        currentPage = []
        currentLength = 0
      }
    }
  }

  if (currentPage.length > 0) {
    pages.push(formatPage(currentPage))
  }

  while (pages.length < pageCount) {
    pages.push("")
  }

  return pages.slice(0, pageCount)
}

function formatPage(sentences: string[]): string {
  if (sentences.length <= 1) return sentences.join("")

  const mid = Math.ceil(sentences.length / 2)
  const para1 = sentences.slice(0, mid).join(" ")
  const para2 = sentences.slice(mid).join(" ")

  if (!para2) return para1
  return `${para1}\n\n${para2}`
}

/**
 * 제목/부제목을 의미 단위로 2줄 분할
 *
 * 규칙:
 * 1. 어절 경계(공백)에서만 분할 — 단어 중간 절단 금지
 * 2. 쉼표에서 줄바꿈 시 쉼표 삭제
 * 3. 절 경계 쉼표(1개)만 우대, 나열형 쉼표(2개+)는 보너스 없음
 * 4. 짧은 1행 선호 — 동점 시 1행이 짧은 쪽 우선
 */
export function splitToTwoLines(text: string): string {
  if (!text) return ""

  if (text.includes("\n")) {
    return text.replace(/,\s*\n/g, "\n").trim()
  }

  const trimmed = text.trim()
  if (trimmed.length <= 3) return trimmed

  const spaces: number[] = []
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === " ") spaces.push(i)
  }

  if (spaces.length === 0) return trimmed

  const commaCount = (trimmed.match(/,/g) ?? []).length
  const isEnumeration = commaCount >= 2
  const adnominalEnd = /[한된진던]$/

  let bestSpace = spaces[0]
  let bestScore = -Infinity

  for (const sp of spaces) {
    const rawL1 = trimmed.slice(0, sp)
    const l2 = trimmed.slice(sp + 1)

    const hasComma = rawL1.endsWith(",") || rawL1.endsWith("，")
    const effL1 = hasComma ? rawL1.length - 1 : rawL1.length
    const effL2 = l2.length

    if (effL1 <= 0 || effL2 <= 0) continue

    const diff = Math.abs(effL1 - effL2)
    let score = -diff

    if (hasComma && !isEnumeration && effL1 >= 6) {
      score += 12
    }

    const lastWord = rawL1.replace(/[,，]$/, "").split(/\s+/).pop() ?? ""
    if (adnominalEnd.test(lastWord) && lastWord.length >= 2) {
      score += 5
    }

    const ratio = Math.min(effL1, effL2) / Math.max(effL1, effL2)
    if (ratio < 0.2) score -= 30

    if (score > bestScore) {
      bestScore = score
      bestSpace = sp
    }
  }

  let line1 = trimmed.slice(0, bestSpace).trim()
  const line2 = trimmed.slice(bestSpace + 1).trim()

  if (line1.endsWith(",") || line1.endsWith("，")) {
    line1 = line1.slice(0, -1).trim()
  }

  if (!line1 || !line2) return trimmed

  return `${line1}\n${line2}`
}
