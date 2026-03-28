import { NextRequest, NextResponse } from "next/server"
import { processText } from "@/lib/text-processing"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { introRaw, title, subtitle } = body

    if (typeof introRaw !== "string" || typeof title !== "string") {
      return NextResponse.json(
        { error: "introRaw, title 필드는 필수입니다." },
        { status: 400 },
      )
    }

    const result = processText(introRaw, title, subtitle ?? "")

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
