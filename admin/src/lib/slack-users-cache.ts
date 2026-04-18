export interface SlackUser {
  id: string
  name: string
  real_name?: string
  display_name?: string
  is_bot?: boolean
  deleted?: boolean
}

let cached: { users: SlackUser[]; fetchedAt: number } | null = null
const TTL_MS = 10 * 60 * 1000

export async function getSlackUsers(): Promise<SlackUser[]> {
  const now = Date.now()
  if (cached && now - cached.fetchedAt < TTL_MS) {
    return cached.users
  }

  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return []

  const users: SlackUser[] = []
  let cursor: string | undefined

  for (let i = 0; i < 10; i++) {
    const qs = new URLSearchParams({ limit: "200" })
    if (cursor) qs.set("cursor", cursor)
    const resp = await fetch(`https://slack.com/api/users.list?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!resp.ok) break
    const data = await resp.json()
    if (!data.ok) break
    const members = data.members ?? []
    for (const m of members) {
      if (m.deleted || m.is_bot) continue
      users.push({
        id: m.id,
        name: m.name ?? "",
        real_name: m.real_name ?? m.profile?.real_name ?? "",
        display_name: m.profile?.display_name ?? "",
      })
    }
    cursor = data.response_metadata?.next_cursor
    if (!cursor) break
  }

  cached = { users, fetchedAt: now }
  return users
}

export function invalidateCache() {
  cached = null
}
