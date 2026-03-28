import { SUIT_FONT_IMPORT, RESET_CSS, FONT_FAMILY, assetsPath } from "./shared-styles"

interface NlPreviewArticleData {
  issue: number
  typeLabel: string
  type: string
  title: string
  subtitle: string
  heroImage: string
  imagePosition?: "top" | "center" | "bottom"
  mode?: "preview" | "export"
  exportAssetsPath?: string
}

const LABEL_COLORS: Record<string, string> = {
  curation: "#F7343C",
  gray: "#9CA3AF",
  branded: "#F59E0B",
}

export function renderNlPreviewArticle(data: NlPreviewArticleData): string {
  const labelColor = LABEL_COLORS[data.type] ?? "#F7343C"
  const objPos = data.imagePosition ?? "center"

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8">
<style>
  ${SUIT_FONT_IMPORT}
  ${RESET_CSS}
  body { width:1080px; height:1350px; font-family:${FONT_FAMILY}; background:#111112; overflow:hidden; display:flex; flex-direction:column; }
  .article-type { padding:85px 72px 0 72px; margin-bottom:76px; }
  .label { color:${labelColor}; font-size:40px; font-weight:750; text-transform:uppercase; letter-spacing:-0.4px; }
  .title-area { display:flex; flex-direction:column; gap:17px; padding:0 72px; margin-bottom:95px; }
  .title { height:220px; display:flex; align-items:flex-end; color:#FFF; font-size:62px; font-weight:750; line-height:140%; letter-spacing:-1.24px; word-break:keep-all; overflow:hidden; text-overflow:ellipsis; }
  .subtitle { color:#B0B0B0; font-size:34px; font-weight:400; line-height:170%; letter-spacing:-0.68px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
  .hero { width:940px; height:560px; object-fit:cover; object-position:${objPos}; border-radius:20px; flex-shrink:0; margin:0 auto; background:lightgray 50%/cover no-repeat; }
  .bottom { width:936px; margin:73px auto 70px auto; display:flex; align-items:center; gap:20px; }
  .footer-text { color:rgba(255,255,255,0.8); font-size:32px; font-weight:400; line-height:145%; white-space:nowrap; }
  .footer-line { flex:1; height:1px; background:rgba(207,207,208,0.8); }
  .footer-right { text-align:right; }
</style></head>
<body>
  <div class="article-type">
    <div class="label">${data.typeLabel}</div>
  </div>
  <div class="title-area">
    <div class="title">${data.title.replace(/\n/g, "<br>")}</div>
    <div class="subtitle">${data.subtitle}</div>
  </div>
  <img class="hero" src="${data.heroImage}" alt="">
  <div class="bottom">
    <span class="footer-text">ANTIEGG Newsletter</span>
    <div class="footer-line"></div>
    <span class="footer-text footer-right">${data.issue}호</span>
  </div>
</body></html>`
}
