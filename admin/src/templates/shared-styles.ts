export const SUIT_FONT_IMPORT = `@import url('https://cdn.jsdelivr.net/gh/sun-typeface/SUIT/fonts/variable/woff2/SUIT-Variable.css');`

export const RESET_CSS = `* { margin: 0; padding: 0; box-sizing: border-box; }`

export const FONT_FAMILY = `'SUIT Variable', 'SUIT', sans-serif`

export function assetsPath(mode: "preview" | "export", exportBasePath?: string): string {
  if (mode === "preview") return "/assets"
  return exportBasePath ? `file://${exportBasePath}` : "/assets"
}
