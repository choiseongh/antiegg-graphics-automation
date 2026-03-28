import { SUIT_FONT_IMPORT, RESET_CSS, FONT_FAMILY, assetsPath } from "./shared-styles"

interface NlPreviewIntroData {
  issue: number
  intro: string
  publisher: string
  mode?: "preview" | "export"
  exportAssetsPath?: string
}

export function renderNlPreviewIntro(data: NlPreviewIntroData): string {
  const assets = assetsPath(data.mode ?? "preview", data.exportAssetsPath)
  const introHtml = data.intro
    .replace(/\*\*([\s\S]*?)\*\*/g, '</span><span class="bold">$1</span><span class="normal">')
    .replace(/\n/g, "<br>")

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8">
<style>
  ${SUIT_FONT_IMPORT}
  ${RESET_CSS}
  body { width:1080px; height:1350px; font-family:${FONT_FAMILY}; background:#111112; overflow:hidden; display:flex; flex-direction:column; }
  /* Top Contents: logo + Newsletter */
  .top-contents { display:flex; align-items:center; gap:15px; padding:66px 0 0 114px; }
  .top-logo { width:54px; height:56.9px; }
  .top-newsletter { color:#FFF; font-size:45px; font-weight:700; line-height:normal; letter-spacing:-0.9px; }
  /* Main: 서문 본문 */
  .main { flex:1; padding:86px 114px 0 114px; display:flex; flex-direction:column; }
  .body-text { flex:1; text-align:justify; font-size:52px; font-weight:400; line-height:170%; letter-spacing:-2.08px; word-break:keep-all; overflow:hidden; color:rgba(223,224,229,0.9); }
  .body-text .bold { color:#FFF; font-weight:600; }
  .body-text .normal { color:rgba(223,224,229,0.9); }
  /* Badge: 발행인 + 호수 */
  .badge { width:100%; margin-top:86px; margin-bottom:80px; padding:24px 51px; display:flex; align-items:center; border-radius:12px; background:rgba(255,255,255,0.05); box-shadow:0.826px 1.652px 8.262px 0 rgba(0,0,0,0.10); backdrop-filter:blur(1.62px); }
  .pub-label { color:#FFF; font-size:32.4px; font-weight:750; line-height:160%; letter-spacing:-0.324px; opacity:0.9; white-space:nowrap; }
  .pub-name { color:#FFF; font-size:32.4px; font-weight:400; line-height:160%; letter-spacing:-0.324px; margin-left:12px; white-space:nowrap; }
  .badge-spacer { flex:1; }
  .issue-num { color:#EEE; font-size:32.4px; font-weight:450; line-height:145%; text-align:right; opacity:0.8; white-space:nowrap; }
</style></head>
<body>
  <div class="top-contents">
    <img class="top-logo" src="${assets}/logo-white.svg" alt="">
    <span class="top-newsletter">Newsletter</span>
  </div>
  <div class="main">
    <div class="body-text"><span class="normal">${introHtml}</span></div>
    <div class="badge">
      <span class="pub-label">발행인</span>
      <span class="pub-name">${data.publisher}</span>
      <div class="badge-spacer"></div>
      <span class="issue-num">${data.issue}호</span>
    </div>
  </div>
</body></html>`
}
