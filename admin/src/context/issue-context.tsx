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

const STORAGE_PREFIX = "antiegg-issue-"

function rawToEdit(raw: RawArticle & { title2line?: string; subtitle2line?: string; introPages?: string[] }): EditArticle {
  return {
    ...raw,
    title2line: raw.title2line ?? "",
    subtitle2line: raw.subtitle2line ?? "",
    introPages: raw.introPages ?? [],
    imagePosition: "center",
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
      const { issue, date, articles } = action.payload
      return {
        ...state,
        issue,
        date,
        articles: articles.map(rawToEdit),
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
          ? { ...a, title2line: "", subtitle2line: "", introPages: [], imagePosition: "center" as const }
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

    case "RESTORE": {
      const restored = action.payload
      return {
        ...restored,
        newsletter: restored.newsletter ?? { title: "", intro: "", publisher: "" },
        editMode: restored.editMode ?? "articles",
      }
    }

    default:
      return state
  }
}

interface IssueContextValue {
  state: IssueState
  dispatch: React.Dispatch<IssueAction>
  saveToStorage: () => void
  restoreFromStorage: (issue: number) => boolean
}

const IssueContext = createContext<IssueContextValue | null>(null)

export function IssueProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(issueReducer, initialState)

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
    <IssueContext.Provider value={{ state, dispatch, saveToStorage, restoreFromStorage }}>
      {children}
    </IssueContext.Provider>
  )
}

export function useIssue(): IssueContextValue {
  const ctx = useContext(IssueContext)
  if (!ctx) throw new Error("useIssue must be used within IssueProvider")
  return ctx
}
