import { SUIT_FONT_IMPORT, RESET_CSS, FONT_FAMILY, assetsPath } from "./shared-styles"

interface NlStoryCoverData {
  issue: number
  title: string
  intro: string
  publisher: string
  mode?: "preview" | "export"
  exportAssetsPath?: string
}

export function renderNlStoryCover(data: NlStoryCoverData): string {
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
  body { width:1080px; height:1920px; font-family:${FONT_FAMILY}; background:#111112; overflow:hidden; display:flex; flex-direction:column; padding:186px 114px 86px 114px; position:relative; }
  /* Badge */
  .badge { align-self:center; padding:20px 40px; border-radius:12px; background:rgba(255,255,255,0.05); box-shadow:0.826px 1.652px 8.262px 0 rgba(0,0,0,0.10); backdrop-filter:blur(1.62px); color:#FFF; text-align:center; font-size:30px; font-weight:700; line-height:160%; letter-spacing:-0.3px; opacity:0.9; margin-bottom:70px; }
  /* Title */
  .title { color:#FFF; text-align:center; font-size:72px; font-weight:750; line-height:145%; letter-spacing:-0.72px; word-break:keep-all; margin-bottom:90px; }
  /* Intro */
  .intro { max-height:897px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:10; text-align:justify; font-size:52px; font-weight:400; line-height:170%; letter-spacing:-2.08px; word-break:keep-all; color:rgba(223,224,229,0.9); }
  .intro .bold { color:#FFF; font-weight:600; }
  .intro .normal { color:rgba(223,224,229,0.9); }
  /* Publisher badge */
  .pub-badge { position:absolute; bottom:228px; left:114px; right:114px; padding:24px 51px; border-radius:12px; background:rgba(255,255,255,0.05); box-shadow:0.826px 1.652px 8.262px 0 rgba(0,0,0,0.10); backdrop-filter:blur(1.62px); display:flex; align-items:center; justify-content:center; gap:12px; }
  .pub-label { color:rgba(255,255,255,0.9); font-size:29.16px; font-weight:750; line-height:160%; letter-spacing:-0.292px; }
  .pub-name { color:rgba(255,255,255,0.9); font-size:29.16px; font-weight:400; line-height:160%; letter-spacing:-0.292px; }
  /* Link sticker */
  .link-sticker { position:absolute; bottom:86px; left:50%; transform:translateX(-50%); width:250px; height:92px; border-top:1px solid #45474D; border-bottom:1px solid #45474D; }
</style></head>
<body>
  <div class="badge">${data.issue}번째 뉴스레터</div>
  <div class="title">${data.title.replace(/\n/g, "<br>")}</div>
  <div class="intro"><span class="normal">${introHtml}</span></div>
  <div class="pub-badge">
    <span class="pub-label">발행인</span>
    <span class="pub-name">${data.publisher}</span>
  </div>
  <div class="link-sticker"></div>
</body></html>`
}
