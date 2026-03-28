import { SUIT_FONT_IMPORT, RESET_CSS, FONT_FAMILY, assetsPath } from "./shared-styles"

interface StoryCoverData {
  typeLabel: string
  type: string
  title2line: string
  subtitle2line: string
  heroImage: string
  imagePosition?: "top" | "center" | "bottom"
  mode?: "preview" | "export"
  exportAssetsPath?: string
}

export function renderStoryCover(data: StoryCoverData): string {
  const assets = assetsPath(data.mode ?? "preview", data.exportAssetsPath)
  const isGray = data.type === "gray"
  const objPos = data.imagePosition ?? "center"

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8">
<style>
  ${SUIT_FONT_IMPORT}
  ${RESET_CSS}
  body { width:1080px; height:1920px; font-family:${FONT_FAMILY}; background:#000; overflow:hidden; position:relative; }
  .hero-image { position:absolute; top:0; left:0; width:1080px; height:1172px; object-fit:cover; object-position:${objPos}; ${isGray ? "filter:grayscale(100%);" : ""} }
  .dim { position:absolute; top:0; left:0; width:1080px; height:1920px; background:linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,1) 61%, rgba(0,0,0,1) 100%); }
  .grain { position:absolute; top:0; left:0; width:1080px; height:1920px; opacity:0.1; background:url('${assets}/grain-dark.png') repeat; background-size:220px 220px; mix-blend-mode:soft-light; pointer-events:none; }
  .contents { position:absolute; top:937px; left:0; width:1080px; height:983px; display:flex; padding:112px 0; flex-direction:column; justify-content:center; align-items:flex-start; gap:42px; }
  .title-group { align-self:stretch; display:flex; flex-direction:column; align-items:center; gap:40px; }
  .label { color:#F7343C; text-align:center; font-size:40px; font-weight:600; line-height:normal; letter-spacing:-0.4px; text-transform:capitalize; }
  .title { align-self:stretch; color:#FFF; text-align:center; font-size:72px; font-weight:700; line-height:140%; letter-spacing:-0.72px; }
  .subtitle { align-self:stretch; color:#C2C4CC; text-align:center; font-size:40px; font-weight:300; line-height:56px; }
  .bottom-contents { align-self:center; display:flex; flex-direction:column; align-items:center; padding-top:42px; gap:50px; }
  .link-sticker { width:250px; height:92px; border-top:1px solid #45474D; border-bottom:1px solid #45474D; }
  .cta { color:#C2C4CC; text-align:center; font-size:28px; font-weight:400; line-height:normal; }
</style></head>
<body>
  <img class="hero-image" src="${data.heroImage}" alt="">
  <div class="dim"></div>
  <div class="grain"></div>
  <div class="contents">
    <div class="title-group">
      <div class="label">${data.typeLabel}</div>
      <div class="title">${data.title2line.replace(/\n/g, "<br>")}</div>
      <div class="subtitle">${data.subtitle2line.replace(/\n/g, "<br>")}</div>
    </div>
    <div class="bottom-contents">
      <div class="link-sticker"></div>
      <div class="cta">콘텐츠 보러가기</div>
    </div>
  </div>
</body></html>`
}
