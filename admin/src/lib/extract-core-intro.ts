/**
 * 서문 핵심 추출 (규칙 기반)
 *
 * 500자 이하 → 그대로 반환
 * 500자 초과 → 단계적 트리밍:
 *   1. 마무리 문장 제거 (소개합니다/살펴봅니다/알아보겠습니다 류)
 *   2. 앞에서부터 문장 단위 제거 (배경 묘사)
 *   3. 목표: ≤ 500자
 */

const MAX_CHARS = 500

const CLOSING_PATTERNS = [
  /소개합니다/,
  /소개해\s*보도록/,
  /소개해\s*봅니다/,
  /소개해\s*드리/,
  /살펴봅니다/,
  /살펴보겠/,
  /살펴보고자/,
  /알아보겠/,
  /탐색하고자/,
  /들여다보려\s*합니다/,
  /되짚어\s*보기로/,
]

interface TaggedSentence {
  text: string
  paraIdx: number
}

function splitSentences(text: string): string[] {
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
  if (remaining) sentences.push(remaining)

  return sentences
}

function isClosing(sentence: string): boolean {
  return CLOSING_PATTERNS.some((p) => p.test(sentence))
}

function rebuild(sentences: TaggedSentence[]): string {
  if (sentences.length === 0) return ""

  const groups: string[][] = []
  let curIdx = sentences[0].paraIdx
  let curGroup: string[] = []

  for (const s of sentences) {
    if (s.paraIdx !== curIdx) {
      groups.push(curGroup)
      curGroup = []
      curIdx = s.paraIdx
    }
    curGroup.push(s.text)
  }
  groups.push(curGroup)

  return groups.map((g) => g.join(" ")).join("\n")
}

export function extractCoreIntro(
  introRaw: string,
  maxChars: number = MAX_CHARS,
): string {
  if (!introRaw.trim() || introRaw.length <= maxChars) return introRaw

  const paragraphs = introRaw.split("\n").filter((p) => p.trim())
  const tagged: TaggedSentence[] = []

  for (let pi = 0; pi < paragraphs.length; pi++) {
    for (const s of splitSentences(paragraphs[pi])) {
      tagged.push({ text: s, paraIdx: pi })
    }
  }

  if (tagged.length <= 1) return introRaw

  let start = 0
  let end = tagged.length

  // Step 1: Remove closing sentences from end
  while (end > start + 1 && isClosing(tagged[end - 1].text)) {
    end--
    if (rebuild(tagged.slice(start, end)).length <= maxChars) break
  }

  if (rebuild(tagged.slice(start, end)).length <= maxChars) {
    return rebuild(tagged.slice(start, end))
  }

  // Step 2: Remove sentences from beginning
  while (start < end - 1 && rebuild(tagged.slice(start, end)).length > maxChars) {
    start++
  }

  return rebuild(tagged.slice(start, end))
}
