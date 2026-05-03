"use client"

import * as React from "react"
import Link from "next/link"

const footerLinks = {
  产品: [
    { href: "/products", label: "全部产品" },
  ],
  支持: [
    { href: "/console/docs", label: "文档中心" },
    { href: "/console/tickets", label: "工单支持" },
    { href: "/contact", label: "联系我们" },
  ],
  公司: [
    { href: "/about", label: "关于我们" },
    { href: "/terms", label: "服务条款" },
    { href: "/privacy", label: "隐私政策" },
  ],
}

export function Footer() {
  const [footerText, setFooterText] = React.useState(`© ${new Date().getFullYear()} 宁宁云IDC. 保留所有权利.`)

  React.useEffect(() => {
    fetch("/api/admin/site-config")
      .then(r => r.ok ? r.json() : null)
      .then(config => { if (config?.footer) setFooterText(config.footer) })
      .catch(() => {})
  }, [])

  return (
    <footer className="border-t">
      <div className="container py-8 md:py-12 px-4 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold">{category}</h3>
              <ul className="mt-4 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 border-t pt-8 text-center">
          <p className="text-sm text-muted-foreground">{footerText}</p>
        </div>
      </div>
    </footer>
  )
}
