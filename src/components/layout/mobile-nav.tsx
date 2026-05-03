"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "next-auth/react"

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/products", label: "产品" },
  { href: "/about", label: "关于我们" },
  { href: "/contact", label: "联系我们" },
]

export function MobileNav() {
  const [isOpen, setIsOpen] = React.useState(false)
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === "ADMIN"

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
        >
          {isOpen ? (
            <path
              d="M6 18L18 6M6 6l12 12"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M3 12h18M3 6h18M3 18h18"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <span className="sr-only">Toggle Menu</span>
      </Button>
      {isOpen && (
        <div className="fixed inset-0 top-14 z-50 grid h-[calc(100vh-3.5rem)] grid-flow-row auto-rows-max overflow-auto p-6 pb-32 shadow-md animate-in slide-in-from-bottom-80 md:hidden">
          <div className="relative z-20 grid gap-6 rounded-md bg-popover p-4 text-popover-foreground shadow-md border">
            <nav className="grid grid-flow-row auto-rows-max text-sm">
              {navLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  className={cn(
                    "flex w-full items-center rounded-md p-2 text-sm font-medium hover:underline",
                    index === 0 && "font-bold"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex w-full items-center rounded-md p-2 text-sm font-medium hover:underline"
                  onClick={() => setIsOpen(false)}
                >
                  管理后台
                </Link>
              )}
              {session && (
                <Link
                  href="/console/servers"
                  className="flex w-full items-center rounded-md p-2 text-sm font-medium hover:underline"
                  onClick={() => setIsOpen(false)}
                >
                  控制台
                </Link>
              )}
            </nav>
            <div className="border-t pt-4">
              {session ? (
                <div className="grid gap-2">
                  <p className="text-sm text-muted-foreground px-2">
                    {session.user?.email}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => { signOut({ callbackUrl: "/" }); setIsOpen(false) }}>
                    退出登录
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/login" onClick={() => setIsOpen(false)}>登录</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/register" onClick={() => setIsOpen(false)}>注册</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
