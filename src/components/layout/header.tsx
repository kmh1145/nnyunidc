"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MobileNav } from "./mobile-nav"
import { useCart } from "@/lib/cart-context"
import { useSession, signOut } from "next-auth/react"

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/products", label: "产品" },
  { href: "/about", label: "关于我们" },
  { href: "/contact", label: "联系我们" },
]

export function Header() {
  const { itemCount } = useCart()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === "ADMIN"
  const [brandName, setBrandName] = React.useState("宁宁云IDC")

  React.useEffect(() => {
    fetch("/api/admin/site-config")
      .then(r => r.ok ? r.json() : null)
      .then(config => {
        if (config?.brandName) setBrandName(config.brandName)
        if (config?.tabTitle) document.title = config.tabTitle
      })
      .catch(() => {})
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4 md:px-6">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              {brandName}
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <MobileNav />
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none pl-2">
            <Link href="/" className="mr-6 flex items-center space-x-2 md:hidden">
              <span className="font-bold">{brandName}</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-2">
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin">管理后台</Link>
              </Button>
            )}
            {session && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/console/servers">控制台</Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link href="/cart">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            </Button>
            {session ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {session.user?.email}
                </span>
                <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                  退出
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">登录</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">注册</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
