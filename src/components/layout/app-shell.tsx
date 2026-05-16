"use client"

import { usePathname } from "next/navigation"
import { Header } from "./header"
import { Footer } from "./footer"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // 安装页面不显示 Header/Footer
  if (pathname === "/install") {
    return <>{children}</>
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
