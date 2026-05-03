"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect } from "react"

const sidebarNavItems = [
  {
    title: "我的服务器",
    href: "/console/servers",
    icon: "🖥️",
  },
  {
    title: "账单列表",
    href: "/console/billing",
    icon: "💰",
  },
  {
    title: "个人信息",
    href: "/console/profile",
    icon: "👤",
  },
  {
    title: "工单管理",
    href: "/console/tickets",
    icon: "📋",
  },
  {
    title: "文档中心",
    href: "/console/docs",
    icon: "📚",
  },
]

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return <div className="container py-8">加载中...</div>
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-56 shrink-0">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">控制台</h2>
            <p className="text-sm text-muted-foreground">
              {session?.user?.name || session?.user?.email}
            </p>
          </div>
          <nav className="space-y-1">
            {sidebarNavItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/console" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.title}
                </Link>
              )
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
