"use client"

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import type {
  IssueState,
  IssueAction,
  EditArticle,
  RawArticle,
} from "@/lib/types"
import { normalizeTitle } from "@/lib/slack"

const UNDOABLE_ACTIONS = new Set([
  "UPDATE_ARTICLE", "PROCESS_TEXT", "RESET_ARTICLE",
  "TOGGLE_TITLE_POSITION", "UPDATE_NEWSLETTER",
  "REORDER_ARTICLES", "SORT_BY_SLACK_ORDER",
])

const MAX_HISTORY = 50

interface HistoryState {
  past: IssueState[]
  present: IssueState
  future: IssueState[]
}

const STORAGE_PREFIX = "antiegg-issue-"

function rawToEdit(raw: RawArticle & { title2line?: string; postTitle2line?: string; nlTitle2line?: string; introTitle?: string; subtitle2line?: string; introPages?: string[] }): EditArticle {
  return {
    ...raw,
    title2line: raw.title2line ?? "",
    postTitle2line: raw.postTitle2line ?? "",
    nlTitle2line: raw.nlTitle2line ?? "",
    introTitle: raw.introTitle ?? "",
    subtitle2line: raw.subtitle2line ?? "",
    introPages: raw.introPages ?? [],
    imagePositions: {
      story: { y: "center", x: "center" },
      post: { y: "center", x: "center" },
      "nl-preview": { y: "center", x: "center" },
    },
  }
}

const initialState: IssueState = {
  issue: 0,
  date: "",
  articles: [],
  newsletter: { title: "", intro: "", publisher: "" },
  editMode: "articles",
  activeArticleIndex: 0,
  activeTab: "story",
  status: "idle",
  lastSaved: null,
}

function issueReducer(state: IssueState, action: IssueAction): IssueState {
  switch (action.type) {
    case "SET_ARTICLES": {
      const { issue, date, articles, newsletter } = action.payload
      return {
        ...state,
        issue,
        date,
        articles: articles.map(rawToEdit),
        newsletter: newsletter ?? state.newsletter,
        activeArticleIndex: 0,
        activeTab: "story",
        status: "ordering",
      }
    }

    case "REORDER_ARTICLES": {
      const { articleType, fromIndex, toIndex } = action.payload
      const typed = state.articles.filter((a) => a.type === articleType)
      const others = state.articles.filter((a) => a.type !== articleType)

      const [moved] = typed.splice(fromIndex, 1)
      typed.splice(toIndex, 0, moved)

      const reordered = typed.map((a, i) => ({ ...a, order: i + 1 }))
      const merged = [...reordered, ...others].sort((a, b) => {
        if (a.type !== b.type) return a.no - b.no
        return a.order - b.order
      })

      return { ...state, articles: merged }
    }

    case "UPDATE_ARTICLE": {
      const { index, updates } = action.payload
      const articles = state.articles.map((a, i) =>
        i === index ? { ...a, ...updates } : a,
      )
      return { ...state, articles }
    }

    case "SET_ACTIVE_ARTICLE":
      return { ...state, activeArticleIndex: action.payload, activeTab: "story" }

    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload }

    case "PROCESS_TEXT": {
      const { index, result } = action.payload
      const articles = state.articles.map((a, i) =>
        i === index
          ? {
              ...a,
              title2line: result.title2line,
              subtitle2line: result.subtitle2line,
              introPages: result.introPages,
            }
          : a,
      )
      return { ...state, articles }
    }

    case "RESET_ARTICLE": {
      const { index } = action.payload
      const article = state.articles[index]
      const articles = state.articles.map((a, i) =>
        i === index
          ? { ...a, title2line: "", subtitle2line: "", introPages: [], imagePositions: { story: { y: "center" as const, x: "center" as const }, post: { y: "center" as const, x: "center" as const }, "nl-preview": { y: "center" as const, x: "center" as const } } }
          : a,
      )
      return { ...state, articles }
    }

    case "TOGGLE_TITLE_POSITION": {
      const idx = action.payload
      const articles = state.articles.map((a, i) =>
        i === idx
          ? { ...a, titlePosition: (a.titlePosition === "top" ? "bottom" : "top") as "top" | "bottom" }
          : a,
      )
      return { ...state, articles }
    }

    case "SET_STATUS":
      return { ...state, status: action.payload }

    case "SET_EDIT_MODE":
      return { ...state, editMode: action.payload }

    case "UPDATE_NEWSLETTER":
      return { ...state, newsletter: { ...state.newsletter, ...action.payload } }

    case "SORT_BY_SLACK_ORDER": {
      const slackTitles = action.payload.map(normalizeTitle)
      const sorted = state.articles.map((article) => {
        const candidates = [article.title, article.notionTitle ?? ""]
          .filter(Boolean)
          .map(normalizeTitle)
        const idx = slackTitles.findIndex(
          (t) => candidates.some((c) => c === t || c.includes(t) || t.includes(c)),
        )
        return { article, idx: idx === -1 ? 999 : idx, matched: idx !== -1 }
      })
        .sort((a, b) => a.idx - b.idx)
        .map(({ article, matched }, i) => ({ ...article, no: i + 1, slackOrderMatched: matched }))

      const typeCounters: Record<string, number> = {}
      const withOrder = sorted.map((article) => {
        typeCounters[article.type] = (typeCounters[article.type] ?? 0) + 1
        return { ...article, order: typeCounters[article.type] }
      })

      return { ...state, articles: withOrder }
    }

    case "RESTORE": {
      const restored = action.payload
      const defaultPos = { y: "center" as const, x: "center" as const }
      return {
        ...restored,
        newsletter: restored.newsletter ?? { title: "", intro: "", publisher: "" },
        editMode: restored.editMode ?? "articles",
        articles: restored.articles.map((a) => ({
          ...a,
          postTitle2line: a.postTitle2line ?? "",
          nlTitle2line: a.nlTitle2line ?? "",
          introTitle: a.introTitle ?? "",
          imagePositions: a.imagePositions ?? {
            story: { ...defaultPos },
            post: { ...defaultPos },
            "nl-preview": { ...defaultPos },
          },
        })),
      }
    }

    default:
      return state
  }
}

function historyReducer(history: HistoryState, action: IssueAction): HistoryState {
  if (action.type === "UNDO") {
    if (history.past.length === 0) return history
    const previous = history.past[history.past.length - 1]
    return {
      past: history.past.slice(0, -1),
      present: {
        ...previous,
        activeArticleIndex: history.present.activeArticleIndex,
        activeTab: history.present.activeTab,
        editMode: history.present.editMode,
        status: history.present.status,
      },
      future: [history.present, ...history.future],
    }
  }

  if (action.type === "REDO") {
    if (history.future.length === 0) return history
    const next = history.future[0]
    return {
      past: [...history.past, history.present],
      present: {
        ...next,
        activeArticleIndex: history.present.activeArticleIndex,
        activeTab: history.present.activeTab,
        editMode: history.present.editMode,
        status: history.present.status,
      },
      future: history.future.slice(1),
    }
  }

  const newPresent = issueReducer(history.present, action)

  if (!UNDOABLE_ACTIONS.has(action.type)) {
    return { ...history, present: newPresent }
  }

  return {
    past: [...history.past.slice(-(MAX_HISTORY - 1)), history.present],
    present: newPresent,
    future: [],
  }
}

interface IssueContextValue {
  state: IssueState
  dispatch: React.Dispatch<IssueAction>
  saveToStorage: () => void
  restoreFromStorage: (issue: number) => boolean
  canUndo: boolean
  canRedo: boolean
}

const IssueContext = createContext<IssueContextValue | null>(null)

export function IssueProvider({ children }: { children: ReactNode }) {
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialState,
    future: [],
  })

  const state = history.present

  useEffect(() => {
    if (state.issue === 0 || state.articles.length === 0) return

    const timer = setTimeout(() => {
      const key = `${STORAGE_PREFIX}${state.issue}`
      const saved: IssueState = { ...state, lastSaved: new Date().toISOString() }
      try {
        localStorage.setItem(key, JSON.stringify(saved))
      } catch { /* quota exceeded — ignore */ }
    }, 500)

    return () => clearTimeout(timer)
  }, [state])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod || e.key !== "z") return
      e.preventDefault()
      dispatch({ type: e.shiftKey ? "REDO" : "UNDO" })
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const saveToStorage = useCallback(() => {
    if (state.issue === 0) return
    const key = `${STORAGE_PREFIX}${state.issue}`
    const saved: IssueState = { ...state, lastSaved: new Date().toISOString() }
    localStorage.setItem(key, JSON.stringify(saved))
  }, [state])

  const restoreFromStorage = useCallback(
    (issue: number): boolean => {
      const key = `${STORAGE_PREFIX}${issue}`
      const raw = localStorage.getItem(key)
      if (!raw) return false
      try {
        const parsed: IssueState = JSON.parse(raw)
        dispatch({ type: "RESTORE", payload: parsed })
        return true
      } catch {
        return false
      }
    },
    [],
  )

  return (
    <IssueContext.Provider value={{ state, dispatch, saveToStorage, restoreFromStorage, canUndo: history.past.length > 0, canRedo: history.future.length > 0 }}>
      {children}
    </IssueContext.Provider>
  )
}

export function useIssue(): IssueContextValue {
  const ctx = useContext(IssueContext)
  if (!ctx) throw new Error("useIssue must be used within IssueProvider")
  return ctx
}
