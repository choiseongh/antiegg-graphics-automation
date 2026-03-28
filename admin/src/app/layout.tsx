import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { IssueProvider } from "@/context/issue-context"
import { ToastProvider } from "@/context/toast-context"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "ANTIEGG 정기그래픽",
  description: "AntiEgg 매거진 주간 인스타그램 카드뉴스 자동 생성",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <IssueProvider>
          <ToastProvider>{children}</ToastProvider>
        </IssueProvider>
      </body>
    </html>
  )
}
