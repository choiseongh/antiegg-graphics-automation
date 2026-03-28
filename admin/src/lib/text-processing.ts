import type { ProcessTextResponse } from "./types"

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
  return {
    introPages: splitIntro(introRaw),
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
 * - 조사 뒤, 절 경계, 수식어/명사구 경계에서 끊기
 * - \n으로 줄바꿈 표시
 */
function splitToTwoLines(text: string): string {
  if (!text) return ""

  const length = text.length
  if (length <= 8) return text

  const mid = Math.floor(length / 2)

  const breakPatterns = [
    /[은는이가을를에서의로와과도만](?=\s|\S)/g,
    /,\s*/g,
    /\s+/g,
  ]

  let bestPos = -1
  let bestDist = Infinity

  for (const pattern of breakPatterns) {
    let match: RegExpExecArray | null
    const regex = new RegExp(pattern.source, pattern.flags)

    while ((match = regex.exec(text)) !== null) {
      const pos = match.index + match[0].length
      if (pos <= 2 || pos >= length - 2) continue

      const dist = Math.abs(pos - mid)
      if (dist < bestDist) {
        bestDist = dist
        bestPos = pos
      }
    }

    if (bestPos !== -1 && bestDist <= mid * 0.6) break
  }

  if (bestPos === -1) {
    const spaceRegex = /\s+/g
    let match: RegExpExecArray | null
    while ((match = spaceRegex.exec(text)) !== null) {
      const pos = match.index
      const dist = Math.abs(pos - mid)
      if (dist < bestDist) {
        bestDist = dist
        bestPos = pos
      }
    }
  }

  if (bestPos === -1) return text

  const line1 = text.slice(0, bestPos).trim()
  const line2 = text.slice(bestPos).trim()

  if (!line1 || !line2) return text

  return `${line1}\n${line2}`
}
