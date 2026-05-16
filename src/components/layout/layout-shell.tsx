"use client"

import { usePathname } from "next/navigation"
import { SessionProvider } from "@/components/providers/session-provider"
import { CartProvider } from "@/lib/cart-context"
import { Header } from "./header"
import { Footer } from "./footer"

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // 安装页面：无 Header/Footer，无 Provider（避免无数据库时崩溃）
  if (pathname === "/install") {
    return <>{children}</>
  }

  return (
    <SessionProvider>
      <CartProvider>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </CartProvider>
    </SessionProvider>
  )
}
