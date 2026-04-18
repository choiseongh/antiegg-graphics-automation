const SLACK_API = "https://slack.com/api"

function token(): string {
  const t = process.env.SLACK_BOT_TOKEN
  if (!t) throw new Error("SLACK_BOT_TOKEN이 설정되지 않았습니다.")
  return t
}

async function slackFetch(method: string, body: unknown): Promise<Record<string, unknown>> {
  const resp = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`Slack ${method} HTTP ${resp.status}`)
  const data = await resp.json()
  if (!data.ok) throw new Error(`Slack ${method}: ${data.error}`)
  return data
}

export async function postMessage(channel: string, text: string, thread_ts?: string): Promise<{ ts: string; channel: string }> {
  const data = await slackFetch("chat.postMessage", { channel, text, thread_ts })
  return { ts: data.ts as string, channel: (data.channel as string) ?? channel }
}

export async function getPermalink(channel: string, message_ts: string): Promise<string> {
  const qs = new URLSearchParams({ channel, message_ts })
  const resp = await fetch(`${SLACK_API}/chat.getPermalink?${qs}`, {
    headers: { Authorization: `Bearer ${token()}` },
  })
  const data = await resp.json()
  if (!data.ok) return ""
  return data.permalink ?? ""
}

export interface UploadFile {
  filename: string
  buffer: Buffer
}

interface UploadURL {
  upload_url: string
  file_id: string
}

async function getUploadUrl(filename: string, length: number): Promise<UploadURL> {
  const body = new URLSearchParams({ filename, length: String(length) })
  const resp = await fetch(`${SLACK_API}/files.getUploadURLExternal`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })
  const data = await resp.json()
  if (!data.ok) throw new Error(`getUploadURLExternal: ${data.error}`)
  return { upload_url: data.upload_url, file_id: data.file_id }
}

async function putToUrl(url: string, buffer: Buffer): Promise<void> {
  const resp = await fetch(url, { method: "POST", body: buffer as unknown as BodyInit })
  if (!resp.ok) throw new Error(`upload PUT ${resp.status}`)
}

async function completeUpload(
  fileIds: string[],
  channel: string,
  thread_ts?: string,
  initial_comment?: string,
): Promise<void> {
  const files = fileIds.map((id) => ({ id }))
  const body: Record<string, unknown> = { files, channel_id: channel }
  if (thread_ts) body.thread_ts = thread_ts
  if (initial_comment) body.initial_comment = initial_comment
  await slackFetch("files.completeUploadExternal", body)
}

export async function uploadFilesToThread(
  channel: string,
  thread_ts: string | undefined,
  files: UploadFile[],
  initial_comment?: string,
): Promise<void> {
  if (files.length === 0) return
  if (files.length > 10) throw new Error(`파일 ${files.length}개는 한 배치당 최대 10개 제한 초과`)

  const fileIds: string[] = []
  for (const f of files) {
    const { upload_url, file_id } = await getUploadUrl(f.filename, f.buffer.length)
    await putToUrl(upload_url, f.buffer)
    fileIds.push(file_id)
  }
  await completeUpload(fileIds, channel, thread_ts, initial_comment)
}

export async function verifyChannelMembership(channel: string): Promise<boolean> {
  try {
    const qs = new URLSearchParams({ channel })
    const resp = await fetch(`${SLACK_API}/conversations.info?${qs}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
    const data = await resp.json()
    if (!data.ok) return false
    return data.channel?.is_member === true
  } catch {
    return false
  }
}

export async function openDmChannel(userId: string): Promise<string | null> {
  try {
    const data = await slackFetch("conversations.open", { users: userId })
    const ch = data.channel as { id?: string } | undefined
    return ch?.id ?? null
  } catch {
    return null
  }
}
