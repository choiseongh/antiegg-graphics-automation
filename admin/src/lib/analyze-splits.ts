// 임시 분석 스크립트 — 분석 후 삭제
import { splitToTwoLines } from "./text-processing"

const data = [
  { issue: 231, title: "엔딩 크레딧에서 주인공을 꼽자면", subtitle: "영화인들의 피, 땀, 눈물을 담은 영화 3편", title2line: "엔딩 크레딧에서\n주인공을 꼽자면", subtitle2line: "영화인들의 피, 땀, 눈물을\n담은 영화 3편" },
  { issue: 231, title: "뒤처진 이미지", subtitle: "진보는 왜 과거를 호출하는가", title2line: "뒤처진\n이미지", subtitle2line: "진보는 왜\n과거를 호출하는가" },
  { issue: 231, title: "완벽을 향한 욕망의 끝에서", subtitle: "독이 된 발전을 다루는 영화 세 편", title2line: "완벽을 향한\n욕망의 끝에서", subtitle2line: "독이 된 발전을 다루는\n영화 세 편" },
  { issue: 231, title: "도시에서 지워진 사람들을 기억하는 법", subtitle: "청계천과 을지로의 남겨진 기록에 관한 책 3권", title2line: "도시에서 지워진 사람들을\n기억하는 법", subtitle2line: "청계천과 을지로의\n남겨진 기록에 관한 책 3권" },
  { issue: 231, title: "첨단 기술이 잊어버린 것에 대하여", subtitle: "진정한 발전을 위하여", title2line: "첨단 기술이\n잊어버린 것에 대하여", subtitle2line: "진정한 발전을\n위하여" },
  { issue: 231, title: "더 나아져야만 진짜 내가 될까", subtitle: "성취 너머의 삶을 돌아보게 하는 영화 3편", title2line: "더 나아져야만\n진짜 내가 될까", subtitle2line: "성취 너머의 삶을\n돌아보게 하는 영화 3편" },
  { issue: 231, title: "취향을 구독하는 법", subtitle: "예술과 기호를 루틴으로 만드는 서비스 3선", title2line: "취향을\n구독하는 법", subtitle2line: "예술과 기호를 루틴으로\n만드는 서비스 3선" },
  { issue: 231, title: "세상에서 가장 달콤한 발전", subtitle: "프라고나르(Jean-Honoré Fragonard)의 연작, \"사랑의 단계(Les Progrès de l'amour)\" 연작을 통해 ", title2line: "세상에서 가장\n달콤한 발전", subtitle2line: "프라고나르의 연작\n\"사랑의 단계\" 연작을 통해" },
  { issue: 231, title: "로렌스 렉이 상상한 기묘한 발전", subtitle: "중화미래주의를 다룬 미디어아트 연작", title2line: "로렌스 렉이 상상한\n기묘한 발전", subtitle2line: "중화미래주의를 다룬\n미디어아트 연작" },
  { issue: 231, title: "노토, 흔들려야 비로소 깊어지는 것", subtitle: "지진 이후, 노토에 남은 이들이 이어가는 것들", title2line: "노토, 흔들려야\n비로소 깊어지는 것", subtitle2line: "지진 이후, 노토에 남은 이들이\n이어가는 것들" },
  { issue: 231, title: "진짜 발전은 인간의 능동적인 선택을 요청한다", subtitle: "전뇌와 클라우드 사이,\n〈공각기동대〉가 남긴 정체성의 질문", title2line: "진짜 발전은 인간의\n능동적인 선택을 요청한다", subtitle2line: "전뇌와 클라우드 사이\n〈공각기동대〉가 남긴 정체성의 질문" },
  { issue: 233, title: "비울수록 선명해지는 본질", subtitle: "단순함과 구조로 혁신을 만든 독일 디자인 3선", title2line: "비울수록\n선명해지는 본질", subtitle2line: "단순함과 구조로 혁신을\n만든 독일 디자인 3선" },
  { issue: 233, title: "상실하고서도 깨닫지 못한 것이 있나요", subtitle: "'시詩'가 상기시키는 잃어버린 3가지 감각", title2line: "상실하고서도\n깨닫지 못한 것이 있나요", subtitle2line: "'시詩'가 상기시키는\n잃어버린 3가지 감각" },
  { issue: 233, title: "미술관 내 파격적인 시도 짚어보기", subtitle: "동시대 문화예술공간의 역할 확장", title2line: "미술관 내 파격적인 시도\n짚어보기", subtitle2line: "동시대 문화예술공간의\n역할 확장" },
  { issue: 233, title: "스크린 밖으로 튀어나온 질문들", subtitle: "변화하는 충무로가 우리에게 묻는 것", title2line: "스크린 밖으로\n튀어나온 질문들", subtitle2line: "변화하는 충무로가\n우리에게 묻는 것" },
  { issue: 233, title: "최후의 기술 VS 최후의 인간", subtitle: "인간이 사라진 자리에 남은 인간다움의 흔적", title2line: "최후의 기술\nVS 최후의 인간", subtitle2line: "인간이 사라진 자리에\n남은 인간다움의 흔적" },
  { issue: 233, title: "동물과 AI, 새로운 공존을 상상하다", subtitle: "인간과 비인간의 경계에서 피어나는 새로운 관계", title2line: "동물과 AI, 새로\n운 공존을 상상하다", subtitle2line: "인간과 비인간의 경계에\n서 피어나는 새로운 관계" },
  { issue: 233, title: "반복에서 발전으로", subtitle: "작은 재료에서 시작되는 클래식 음악 세 작품", title2line: "반복에서\n발전으로", subtitle2line: "작은 재료에서 시작되는\n클래식 음악 세 작품" },
  { issue: 233, title: "하우스 음악에 심장이 뛰는 이유", subtitle: "키키부터 하투하까지\n케이팝에 돌아온 하우스", title2line: "하우스 음악에\n심장이 뛰는 이유", subtitle2line: "키키부터 하투하까지\n케이\n팝에 돌아온 하우스" },
  { issue: 233, title: "신입 락페러를 위한 페스티벌 입문서", subtitle: "지난해, 페스티벌만 10번 넘게 간 이유 (feat. 락・재즈・제이팝)", title2line: "신입 락페러를\n위한 페스티벌 입문서", subtitle2line: "지난해, 페스티벌만 10번 넘게 간 이\n유 (feat. 락・재즈・제이팝)" },
  { issue: 234, title: "알파고 대국 10주년, 바둑판은 미래의 축소판일까", subtitle: "승부에서 공존으로", title2line: "알파고 대국 10주년 \n바둑판은 미래의 축소판일까", subtitle2line: "승부에서\n공존으로" },
  { issue: 234, title: "나의 자유와 존엄을 고집하는 세 권의 책", subtitle: "자기 자신이기를 고수하는 일", title2line: "나의 자유와 존엄을\n고집하는 세 권의 책", subtitle2line: "자기 자신이\n기를 고수하는 일" },
  { issue: 234, title: "연극 <히스토리 보이즈>와 <어나더 컨트리>로 살피는 사회와 인간의 시차", subtitle: "우리는 늘 과정의 가운데에 있다", title2line: "연극 <히스토리 보이즈>와\n<어나더 컨트리>로\n살피는 사회와 인간의 시차", subtitle2line: "우리는 늘 과정의 가운데에 있다" },
  { issue: 234, title: "멈춘 자리에서 피어난 통찰", subtitle: "안규철, 에마 미첼, 존 버거처럼 관찰하기 ", title2line: "멈춘 자리에서\n피어난 통찰", subtitle2line: "안규철, 에마 미첼, 존 버거처럼\n관찰하기" },
  { issue: 234, title: "기술의 주인은 누구인가", subtitle: "AI 시대 세 예술가가 선택한 방식", title2line: "기술의 주인은\n누구인가", subtitle2line: "AI 시대 세 예술가가\n선택한 방식" },
  { issue: 234, title: "불편한 카메라를 만드는 이유", subtitle: "유능한 기술이 우리를 무능하게 만들 때", title2line: "불편한 카메라를\n만드는 이유", subtitle2line: "유능한 기술이 우리를\n무능하게 만들 때" },
  { issue: 234, title: "삭제된 어제를 저장하는 마산창고", subtitle: "사라지기 직전의 것들을 줍는\n마산 골목의 작은 박물관", title2line: "삭제된 어제를\n저장하는 마산창고", subtitle2line: "사라지기 직전의 것들을 줍는\n마산 골목의 작은 박물관" },
  { issue: 234, title: "요약이 삼키지 못한 문장들, 머무름의 책 3권", subtitle: "결론 중심 독서의 시대, 사유의 주권을 되찾는 일", title2line: "요약이 삼키지 못한 문장들\n머무름의 책 3권", subtitle2line: "결론 중심 독서의 시대\n사유의 주권을 되찾는 일" },
  { issue: 234, title: "끝없는 레이스에서 대니 보일이 사수한 국가의 첫인사", subtitle: "2012년 런던 올림픽 개막식, 영국의 정신을 불러내다", title2line: "끝없는 레이스에서\n대니 보일이 사수한 국가의 첫인사", subtitle2line: "2012년 런던 올림픽 개막식\n영국의 정신을 불러내다" },
  { issue: 234, title: "데이터 식민주의라는 착취의 새 얼굴", subtitle: "편리한 AI 기술 뒤에 숨겨진, 거대한 착취의 사슬", title2line: "데이터 식민주의라는\n착취의 새 얼굴", subtitle2line: "편리한 AI 기술 뒤에 숨겨진\n거대한 착취의 사슬" },
  { issue: 232, title: "80%를 공유하며 되찾은 인간적인 삶", subtitle: "공동의 가치로 연결되는 덴마크 스반홀름 공동체", title2line: "80%를 공유하며 되찾은\n인간적인 삶", subtitle2line: "공동의 가치로 연결되는\n덴마크 스반홀름 공동체" },
  { issue: 232, title: "가벼워진 세상, 우리는 왜 더 외로울까?", subtitle: "'액체현대'로 본 발전의 역설과 개인 고립", title2line: "가벼워진 세상\n우리는 왜 더 외로울까?", subtitle2line: "'액체현대'로 본\n발전의 역설과 개인 고립" },
  { issue: 232, title: "보는 관객에서 통과하는 몸으로", subtitle: "공간·시간·접속으로 감각하는 현대예술 작품 3선", title2line: "보는 관객에서\n통과하는 몸으로", subtitle2line: "공간·시간·접속으로 감각하는\n현대예술 작품 3선" },
  { issue: 232, title: "어떤 미술관은 브랜드가 된다", subtitle: "각자의 방식으로 발전을 선택한 미술관들", title2line: "어떤 미술관은\n브랜드가 된다", subtitle2line: "각자의 방식으로\n발전을 선택한 미술관들" },
  { issue: 232, title: "0과 1만으로 다 설명할 수 없는 것들", subtitle: "세 편의 SF로 우리의 미래 점치기 ", title2line: "0과 1만으로\n다 설명할 수 없는 것들", subtitle2line: "세 편의 SF로\n우리의 미래 점치기" },
  { issue: 232, title: "섬광 뒤에 남은 것들", subtitle: "도약하는 세계를 응시하는 영화들", title2line: "섬광 뒤에\n남은 것들", subtitle2line: "도약하는 세계를\n응시하는 영화들" },
  { issue: 232, title: "새로운 장면은 새로운 관객으로부터", subtitle: "관객을 변혁하려는 연극사의 사유와 실천들 ", title2line: "새로운 장면은\n새로운 관객으로부터", subtitle2line: "관객을 변혁하려는\n연극사의 사유와 실천들" },
  { issue: 232, title: "지금 '더 피트'를 봐야만 하는 이유", subtitle: "의학 드라마가 나아갈 다음 단계를 보여주는 시리즈", title2line: "지금 '더 피트'를\n봐야만 하는 이유", subtitle2line: "의학 드라마가 나아갈 다음 단계를\n보여주는 시리즈" },
  { issue: 232, title: "SF소설이 바라본 인간의 미래", subtitle: "발전이라는 오래된 질문", title2line: "SF소설이\n바라본 인간의 미래", subtitle2line: "발전이라는\n오래된 질문" },
  { issue: 232, title: "무한의 시대에 유한성으로 답하는 법", subtitle: "스트리밍의 시대에도 LP와 CD가 공존할 수 있는 이유", title2line: "무한의 시대에\n유한성으로 답하는 법", subtitle2line: "스트리밍의 시대에도 \nLP와 CD가 공존할 수 있는 이유" },
]

interface Result {
  issue: number
  field: string
  original: string
  auto: string
  manual: string
  match: boolean
  autoLine1Len: number
  autoLine2Len: number
  manualLine1Len: number
  manualLine2Len: number
  diffType: string
}

function normalize(s: string): string {
  return s.split("\n").map(l => l.trim()).join("\n")
}

const results: Result[] = []

for (const d of data) {
  const autoTitle = splitToTwoLines(d.title)
  const manualTitle = d.title2line
  if (normalize(autoTitle) !== normalize(manualTitle)) {
    const [al1, al2] = autoTitle.split("\n")
    const [ml1, ml2] = manualTitle.split("\n")
    results.push({
      issue: d.issue, field: "title", original: d.title,
      auto: autoTitle, manual: manualTitle, match: false,
      autoLine1Len: al1?.length ?? 0, autoLine2Len: al2?.length ?? 0,
      manualLine1Len: ml1?.length ?? 0, manualLine2Len: ml2?.length ?? 0,
      diffType: classifyDiff(autoTitle, manualTitle, d.title),
    })
  }

  const autoSub = splitToTwoLines(d.subtitle)
  const manualSub = d.subtitle2line
  if (normalize(autoSub) !== normalize(manualSub)) {
    const [al1, al2] = autoSub.split("\n")
    const [ml1, ml2] = manualSub.split("\n")
    results.push({
      issue: d.issue, field: "subtitle", original: d.subtitle,
      auto: autoSub, manual: manualSub, match: false,
      autoLine1Len: al1?.length ?? 0, autoLine2Len: al2?.length ?? 0,
      manualLine1Len: ml1?.length ?? 0, manualLine2Len: ml2?.length ?? 0,
      diffType: classifyDiff(autoSub, manualSub, d.subtitle),
    })
  }
}

function classifyDiff(auto: string, manual: string, original: string): string {
  const autoLines = auto.split("\n")
  const manualLines = manual.split("\n")

  // 줄 수 자체가 다름 (3줄로 변경, 또는 1줄 유지)
  if (autoLines.length !== manualLines.length) return "LINE_COUNT_CHANGE"

  // 텍스트 자체가 수정됨 (축약 등)
  const autoText = auto.replace(/\n/g, "")
  const manualText = manual.replace(/\n/g, "")
  if (autoText !== manualText) return "TEXT_EDITED"

  // 끊기 위치만 다름
  if (autoLines[0].length < manualLines[0].length) return "BREAK_MOVED_RIGHT"
  if (autoLines[0].length > manualLines[0].length) return "BREAK_MOVED_LEFT"

  return "UNKNOWN"
}

// 출력
console.log(`\n=== 분석 결과 ===`)
console.log(`전체: ${data.length * 2}건 (제목 ${data.length} + 부제목 ${data.length})`)
console.log(`불일치: ${results.length}건`)
console.log(`일치율: ${((data.length * 2 - results.length) / (data.length * 2) * 100).toFixed(1)}%\n`)

// 유형별 집계
const typeCounts: Record<string, number> = {}
for (const r of results) {
  typeCounts[r.diffType] = (typeCounts[r.diffType] ?? 0) + 1
}
console.log("=== 불일치 유형 ===")
for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`${type}: ${count}건`)
}

console.log("\n=== 상세 비교 ===")
for (const r of results) {
  console.log(`\n[${r.issue}호] ${r.field} — ${r.diffType}`)
  console.log(`  원본: "${r.original}"`)
  console.log(`  자동: "${r.auto}" (${r.autoLine1Len}/${r.autoLine2Len})`)
  console.log(`  수정: "${r.manual}" (${r.manualLine1Len}/${r.manualLine2Len})`)
}
