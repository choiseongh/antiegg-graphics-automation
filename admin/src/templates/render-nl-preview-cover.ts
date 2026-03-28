import { SUIT_FONT_IMPORT, RESET_CSS, FONT_FAMILY, assetsPath } from "./shared-styles"

interface NlPreviewCoverData {
  issue: number
  title: string
  mode?: "preview" | "export"
  exportAssetsPath?: string
}

export function renderNlPreviewCover(data: NlPreviewCoverData): string {
  const assets = assetsPath(data.mode ?? "preview", data.exportAssetsPath)

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8">
<style>
  ${SUIT_FONT_IMPORT}
  ${RESET_CSS}
  body { width:1080px; height:1350px; font-family:${FONT_FAMILY}; background:#111112; overflow:hidden; display:flex; flex-direction:column; align-items:center; padding-top:187px; }
  /* Main: logo + title */
  .main { display:flex; flex-direction:column; align-items:center; }
  .logo-group { display:flex; flex-direction:column; align-items:center; gap:19px; margin-bottom:288px; }
  .logotype { height:auto; }
  .newsletter-svg { height:auto; }
  /* Title area */
  .title-area { display:flex; flex-direction:column; gap:70px; align-items:center; align-self:stretch; padding:0 72px; }
  .badge { display:inline-flex; padding:20px 40px; border-radius:12px; background:rgba(255,255,255,0.05); box-shadow:0.826px 1.652px 8.262px 0 rgba(0,0,0,0.10); backdrop-filter:blur(1.62px); color:#FFF; text-align:center; font-size:30px; font-weight:700; line-height:160%; letter-spacing:-0.3px; opacity:0.9; }
  .title { color:#FFF; text-align:center; font-size:80px; font-weight:750; line-height:136%; letter-spacing:-0.8px; word-break:keep-all; align-self:stretch; }
  /* Bottom */
  .bottom { position:absolute; bottom:64px; right:90px; }
  .bottom-logo { width:60px; height:63.27px; }
</style></head>
<body>
  <div class="main">
    <div class="logo-group">
      <img class="logotype" src="${assets}/logotype.svg" alt="ANTIEGG">
      <img class="newsletter-svg" src="${assets}/Newsletter.svg" alt="Newsletter">
    </div>
  </div>
  <div class="title-area">
    <div class="badge">${data.issue}번째 뉴스레터</div>
    <div class="title">${data.title.replace(/\n/g, "<br>")}</div>
  </div>
  <div class="bottom">
    <img class="bottom-logo" src="${assets}/logo-white.svg" alt="">
  </div>
</body></html>`
}
