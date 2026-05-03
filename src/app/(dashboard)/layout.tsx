"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"

const sidebarNavItems = [
  {
    title: "个人信息",
    href: "/profile",
  },
  {
    title: "我的订单",
    href: "/orders",
  },
  {
    title: "收货地址",
    href: "/addresses",
  },
  {
    title: "安全设置",
    href: "/security",
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  if (status === "loading") {
    return <div className="container py-8">加载中...</div>
  }

  if (status === "unauthenticated") {
    redirect("/login")
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            {sidebarNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {item.title}
                </Link>
              )
            })}
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
