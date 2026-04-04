import { SUIT_FONT_IMPORT, RESET_CSS, FONT_FAMILY, assetsPath } from "./shared-styles"

interface IntroPageData {
  articleTitle: string
  introParagraphs: string[]
  mode?: "preview" | "export"
  exportAssetsPath?: string
}

export function renderIntroPage(data: IntroPageData): string {
  const assets = assetsPath(data.mode ?? "preview", data.exportAssetsPath)
  const paragraphsHtml = data.introParagraphs
    .map((p) => `<p>${p}</p>`)
    .join("\n      ")

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8">
<style>
  ${SUIT_FONT_IMPORT}
  ${RESET_CSS}
  body { width:1080px; height:1350px; font-family:${FONT_FAMILY}; background:#DFE3F0 url('${assets}/bg-intro.png') no-repeat center/cover; overflow:hidden; position:relative; }
  .grain { position:absolute; top:0; left:0; width:1080px; height:1350px; pointer-events:none; z-index:1; }
  .grain img { width:1080px; height:1350px; }
  .body-area { position:absolute; top:70px; left:70px; width:940px; max-height:960px; overflow:hidden; z-index:2; }
  .body-text { width:100%; max-height:960px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:9; color:#17181A; font-size:56px; font-weight:400; font-style:normal; line-height:175%; letter-spacing:-1.12px; word-break:break-all; }
  .body-text p { margin-bottom:24px; }
  .body-text p:last-child { margin-bottom:0; }
  .bottom-contents { position:absolute; bottom:65px; left:90px; width:900px; height:55px; display:flex; justify-content:space-between; align-items:center; gap:40px; z-index:2; }
  .footer-title { flex:1 0 0; color:#17181A; font-size:30px; font-weight:400; font-style:normal; line-height:37px; letter-spacing:-0.6px; }
  .logo { width:60px; height:63.27px; flex-shrink:0; }
</style></head>
<body>
  <div class="grain"><img src="${assets}/grain-intro.png" alt=""></div>
  <div class="body-area">
    <div class="body-text">
      ${paragraphsHtml}
    </div>
  </div>
  <div class="bottom-contents">
    <div class="footer-title">${data.articleTitle}</div>
    <img class="logo" src="${assets}/logo-black.svg" alt="">
  </div>
</body></html>`
}
