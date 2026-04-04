import { SUIT_FONT_IMPORT, RESET_CSS, FONT_FAMILY, assetsPath } from "./shared-styles"

interface PostCoverData {
  typeLabel: string
  type: string
  title2line: string
  editor: string
  heroImage: string
  titlePosition: "top" | "bottom"
  imagePosition?: "top" | "center" | "bottom"
  imagePositionX?: "left" | "center" | "right"
  mode?: "preview" | "export"
  exportAssetsPath?: string
}

export function renderPostCover(data: PostCoverData): string {
  const assets = assetsPath(data.mode ?? "preview", data.exportAssetsPath)
  const isGray = data.type === "gray"
  const isTop = data.titlePosition === "top"
  const objPos = `${data.imagePositionX ?? "center"} ${data.imagePosition ?? "center"}`

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8">
<style>
  ${SUIT_FONT_IMPORT}
  ${RESET_CSS}
  body { width:1080px; height:1350px; font-family:${FONT_FAMILY}; background:#000; overflow:hidden; position:relative; }
  .hero-image { position:absolute; top:0; left:0; width:1080px; height:1350px; object-fit:cover; object-position:${objPos}; ${isGray ? "filter:grayscale(100%);" : ""} }
  .dim-bottom { position:absolute; top:0; left:0; width:1080px; height:1350px; background:linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,1) 100%); }
  .dim-top { position:absolute; top:0; left:0; width:1080px; height:1350px; background:linear-gradient(0deg, rgba(0,0,0,0) 32%, rgba(0,0,0,1) 100%); }
  .top { position:absolute; top:65px; left:90px; width:900px; height:50px; display:flex; align-items:center; gap:20px; }
  .label { color:#FFF; font-size:30px; font-weight:800; line-height:normal; text-shadow:1px 1px 15px rgba(0,0,0,0.5); }
  .main-title { position:absolute; left:90px; width:900px; height:800px; display:flex; flex-direction:column; align-items:flex-start; gap:40px; }
  .main-title.pos-bottom { top:265px; justify-content:flex-end; }
  .main-title.pos-top { top:265px; justify-content:flex-start; }
  .title { align-self:stretch; color:#FFF; font-size:80px; font-weight:750; line-height:145%; letter-spacing:-1.6px; text-shadow:3px 10px 40px rgba(0,0,0,0.4); }
  .editor-row { width:900px; height:50px; display:flex; align-items:center; gap:14px; align-self:stretch; }
  .editor-label,.editor-divider,.editor-name { color:#FFF; font-size:32px; font-style:normal; line-height:normal; }
  .editor-label { font-weight:500; }
  .editor-divider { font-weight:300; opacity:0.5; }
  .editor-name { font-weight:500; }
  .bottom-contents { position:absolute; bottom:65px; left:90px; width:900px; height:55px; display:flex; justify-content:flex-end; align-items:center; gap:40px; }
  .logo { width:60px; height:63.27px; }
</style></head>
<body>
  <img class="hero-image" src="${data.heroImage}" alt="">
  ${isTop ? '<div class="dim-top"></div>' : '<div class="dim-bottom"></div>'}
  <div class="top"><div class="label">${data.typeLabel}</div></div>
  <div class="main-title ${isTop ? "pos-top" : "pos-bottom"}">
    <div class="title">${data.title2line.replace(/\n/g, "<br>")}</div>
    <div class="editor-row">
      <span class="editor-label">에디터</span>
      <span class="editor-divider">|</span>
      <span class="editor-name">${data.editor}</span>
    </div>
  </div>
  <div class="bottom-contents">
    <img class="logo" src="${assets}/logo-white.svg" alt="">
  </div>
</body></html>`
}
