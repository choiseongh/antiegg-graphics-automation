export interface NotionArticle {
  url: string
  type: ArticleType
  notionTitle: string
  date: string
  pageId: string
}

export type ArticleType = "curation" | "gray" | "branded"

export interface RawArticle {
  no: number
  type: ArticleType
  order: number
  slug: string
  title: string
  notionTitle: string
  subtitle: string
  editor: string
  heroImage: string
  introRaw: string
  introCharCount: number
  titlePosition: "top" | "bottom"
  slackOrderMatched?: boolean
  title2line?: string
  subtitle2line?: string
  introPages?: string[]
}

export interface ProcessedArticle extends Omit<RawArticle, "introRaw" | "introCharCount"> {
  title2line: string
  subtitle2line: string
  introPages: string[]
}

export interface FetchArticlesResponse {
  issue: number
  date: string
  articles: RawArticle[]
}

export interface ProcessTextRequest {
  introRaw: string
  title: string
  subtitle: string
}

export interface ProcessTextResponse {
  introPages: string[]
  title2line: string
  subtitle2line: string
}

// --- Edit State ---

export type ImagePosY = "top" | "center" | "bottom"
export type ImagePosX = "left" | "center" | "right"
export interface ImagePos { y: ImagePosY; x: ImagePosX }

export interface EditArticle extends RawArticle {
  title2line: string
  postTitle2line: string
  nlTitle2line: string
  introTitle: string
  subtitle2line: string
  introPages: string[]
  imagePositions: Record<"story" | "post" | "nl-preview", ImagePos>
}

export type ActiveTab = "story" | "post" | "nl-preview" | "intro1" | "intro2" | "intro3"

export type EditMode = "articles" | "newsletter"

export interface NewsletterData {
  title: string
  intro: string
  publisher: string
}

export interface IssueState {
  issue: number
  date: string
  articles: EditArticle[]
  newsletter: NewsletterData
  editMode: EditMode
  activeArticleIndex: number
  activeTab: ActiveTab
  status: "idle" | "fetching" | "ordering" | "editing" | "exporting"
  lastSaved: string | null
}

export type IssueAction =
  | { type: "SET_ARTICLES"; payload: { issue: number; date: string; articles: RawArticle[] } }
  | { type: "REORDER_ARTICLES"; payload: { articleType: ArticleType; fromIndex: number; toIndex: number } }
  | { type: "UPDATE_ARTICLE"; payload: { index: number; updates: Partial<EditArticle> } }
  | { type: "SET_ACTIVE_ARTICLE"; payload: number }
  | { type: "SET_ACTIVE_TAB"; payload: ActiveTab }
  | { type: "SET_EDIT_MODE"; payload: EditMode }
  | { type: "UPDATE_NEWSLETTER"; payload: Partial<NewsletterData> }
  | { type: "PROCESS_TEXT"; payload: { index: number; result: ProcessTextResponse } }
  | { type: "RESET_ARTICLE"; payload: { index: number } }
  | { type: "TOGGLE_TITLE_POSITION"; payload: number }
  | { type: "SET_STATUS"; payload: IssueState["status"] }
  | { type: "RESTORE"; payload: IssueState }
  | { type: "SORT_BY_SLACK_ORDER"; payload: string[] }
  | { type: "UNDO" }
  | { type: "REDO" }

export interface WorkHistoryEntry {
  issue: number
  date: string
  lastAccessed: string
  articleCount: number
}
