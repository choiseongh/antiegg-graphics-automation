import { SUIT_FONT_IMPORT, RESET_CSS, FONT_FAMILY, assetsPath } from "./shared-styles"

interface ArticleListItem {
  typeLabel: string
  type: string
  title: string
}

interface NlStoryListData {
  issue: number
  articles: ArticleListItem[]
  pageIndex: number
  mode?: "preview" | "export"
  exportAssetsPath?: string
}

const LABEL_COLORS: Record<string, string> = {
  curation: "#F7343C",
  gray: "#F7343C",
  branded: "#F7343C",
}

export function renderNlStoryList(data: NlStoryListData): string {
  const assets = assetsPath(data.mode ?? "preview", data.exportAssetsPath)
  const itemsHtml = data.articles
    .map((a) => {
      const color = LABEL_COLORS[a.type] ?? "#F7343C"
      return `<div class="item"><span class="type" style="color:${color}">${a.typeLabel.toUpperCase()}</span><span class="article-title">${a.title}</span></div>`
    })
    .join("\n      ")

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8">
<style>
  ${SUIT_FONT_IMPORT}
  ${RESET_CSS}
  body { width:1080px; height:1920px; font-family:${FONT_FAMILY}; background:#111112; overflow:hidden; display:flex; flex-direction:column; align-items:center; padding:186px 40px 86px 40px; position:relative; }
  /* Badge — same as story cover */
  .badge { padding:20px 40px; border-radius:12px; background:rgba(255,255,255,0.05); box-shadow:0.826px 1.652px 8.262px 0 rgba(0,0,0,0.10); backdrop-filter:blur(1.62px); color:#FFF; text-align:center; font-size:30px; font-weight:700; line-height:160%; letter-spacing:-0.3px; opacity:0.9; margin-bottom:80px; }
  /* Logo — same as preview cover */
  .logo-group { display:flex; flex-direction:column; align-items:center; gap:19px; margin-bottom:90px; }
  .logotype { height:auto; }
  .newsletter-svg { height:auto; }
  /* Article List */
  .list { width:100%; display:flex; flex-direction:column; gap:20px; }
  .item { display:flex; align-items:center; gap:47px; min-height:98px; padding:24px 51px; background:rgba(255,255,255,0.05); border-radius:12px; flex-shrink:0; }
  .type { width:138px; flex-shrink:0; font-size:24.48px; font-weight:900; line-height:110%; letter-spacing:-0.49px; text-transform:uppercase; }
  .article-title { color:#FFF; font-size:36px; font-weight:600; line-height:140%; letter-spacing:-0.72px; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
  /* Bottom — link sticker */
  .link-sticker { position:absolute; bottom:86px; left:50%; transform:translateX(-50%); width:250px; height:92px; border-top:1px solid #45474D; border-bottom:1px solid #45474D; }
</style></head>
<body>
  <div class="badge">${data.issue}번째 뉴스레터</div>
  <div class="logo-group">
    <img class="logotype" src="${assets}/logotype.svg" alt="ANTIEGG">
    <img class="newsletter-svg" src="${assets}/Newsletter.svg" alt="Newsletter">
  </div>
  <div class="list">
      ${itemsHtml}
  </div>
  <div class="link-sticker"></div>
</body></html>`
}

export function splitArticlesIntoPages(articles: ArticleListItem[], perPage: number = 8): ArticleListItem[][] {
  const pages: ArticleListItem[][] = []
  for (let i = 0; i < articles.length; i += perPage) {
    pages.push(articles.slice(i, i + perPage))
  }
  return pages
}
