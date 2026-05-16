"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect } from "react"

const sidebarNavItems = [
  {
    title: "仪表盘",
    href: "/admin",
    icon: "📊",
  },
  {
    title: "产品管理",
    href: "/admin/products",
    icon: "📦",
  },
  {
    title: "订单管理",
    href: "/admin/orders",
    icon: "📋",
  },
  {
    title: "服务器管理",
    href: "/admin/servers",
    icon: "🖥️",
  },
  {
    title: "工单管理",
    href: "/admin/tickets",
    icon: "📋",
  },
  {
    title: "用户管理",
    href: "/admin/users",
    icon: "👥",
  },
  {
    title: "接口管理",
    href: "/admin/platforms",
    icon: "🔌",
  },
  {
    title: "支付设置",
    href: "/admin/payments",
    icon: "💳",
  },
  {
    title: "优惠码",
    href: "/admin/promos",
    icon: "🏷️",
  },
  {
    title: "新闻管理",
    href: "/admin/news",
    icon: "📰",
  },
  {
    title: "邮件模板",
    href: "/admin/email-templates",
    icon: "📧",
  },
  {
    title: "系统日志",
    href: "/admin/logs",
    icon: "📜",
  },
  {
    title: "站务设置",
    href: "/admin/settings",
    icon: "⚙️",
  },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (pathname !== "/admin/login") {
      if (status === "unauthenticated") {
        router.push("/admin/login")
      } else if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
        router.push("/")
      }
    }
  }, [status, session, router, pathname])

  // 登录页面不需要验证和侧边栏
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  if (status === "loading") {
    return <div className="container py-8">加载中...</div>
  }

  if (status === "unauthenticated" || (status === "authenticated" && (session?.user as any)?.role !== "ADMIN")) {
    return null
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">管理后台</h2>
            <p className="text-sm text-muted-foreground">
              {session?.user?.name}
            </p>
          </div>
          <nav className="space-y-1">
            {sidebarNavItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 text-sm rounded-md transition-colors ${
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
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
