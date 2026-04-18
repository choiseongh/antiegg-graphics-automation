import type { SlackUser } from "./slack-users-cache"

export const EDITOR_OVERRIDES: Record<string, string> = {
  Nile: "U0A4E3BEGNL",
}

export interface EditorResolveResult {
  resolved: Record<string, string>
  unmatched: string[]
}

export function resolveEditors(editors: string[], users: SlackUser[]): EditorResolveResult {
  const resolved: Record<string, string> = {}
  const unmatched: string[] = []

  const byReal = new Map<string, string>()
  const byDisplay = new Map<string, string>()
  const byName = new Map<string, string>()
  for (const u of users) {
    if (u.real_name) byReal.set(normalize(u.real_name), u.id)
    if (u.display_name) byDisplay.set(normalize(u.display_name), u.id)
    if (u.name) byName.set(normalize(u.name), u.id)
  }

  const unique = Array.from(new Set(editors))
  for (const editor of unique) {
    if (!editor) continue
    if (EDITOR_OVERRIDES[editor]) {
      resolved[editor] = EDITOR_OVERRIDES[editor]
      continue
    }
    const key = normalize(editor)
    const id = byReal.get(key) ?? byDisplay.get(key) ?? byName.get(key)
    if (id) {
      resolved[editor] = id
    } else {
      unmatched.push(editor)
    }
  }

  return { resolved, unmatched }
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "")
}
