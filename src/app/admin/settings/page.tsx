"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DocArticle {
  id: string
  title: string
  slug: string
  content: string
  category: string
  sortOrder: number
  isPublished: boolean
}

const docCategories = [
  { value: "quickstart", label: "快速开始" },
  { value: "server", label: "服务器管理" },
  { value: "network", label: "网络相关" },
  { value: "faq", label: "常见问题" },
]

export default function SettingsPage() {
  const [tab, setTab] = React.useState<"site" | "docs" | "notify">("site")
  const [notifySub, setNotifySub] = React.useState<"email" | "sms">("email")
  const [saving, setSaving] = React.useState(false)
  const [docs, setDocs] = React.useState<DocArticle[]>([])
  const [docForm, setDocForm] = React.useState({
    id: "", title: "", slug: "", content: "", category: "quickstart", sortOrder: 0, isPublished: true,
  })
  const [editingDocId, setEditingDocId] = React.useState<string | null>(null)
  const [siteForm, setSiteForm] = React.useState({
    siteTitle: "宁宁云IDC", tabTitle: "宁宁云IDC", brandName: "宁宁云IDC",
    keywords: "", description: "", footer: "",
    smtpHost: "", smtpPort: "587", smtpUser: "", smtpPass: "", smtpFrom: "", smtpSecure: false,
  })

  React.useEffect(() => {
    fetch("/api/admin/site-config").then(r => {
      if (!r.ok) return
      r.json().then(d => setSiteForm({
        siteTitle: d.siteTitle || "宁宁云IDC", tabTitle: d.tabTitle || "宁宁云IDC",
        brandName: d.brandName || "宁宁云IDC", keywords: d.keywords || "",
        description: d.description || "", footer: d.footer || "",
        smtpHost: d.smtpHost || "", smtpPort: d.smtpPort?.toString() || "587",
        smtpUser: d.smtpUser || "", smtpPass: d.smtpPass || "",
        smtpFrom: d.smtpFrom || "", smtpSecure: d.smtpSecure || false,
      }))
    })
  }, [])

  React.useEffect(() => {
    if (tab === "docs") fetchDocs()
  }, [tab])

  async function fetchDocs() {
    try {
      const res = await fetch("/api/admin/docs")
      if (res.ok) setDocs(await res.json())
    } catch { console.error("获取文档失败") }
  }

  async function handleSiteSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siteForm),
      })
    } catch { console.error("保存失败") }
    finally { setSaving(false) }
  }

  function handleDocEdit(doc: DocArticle) {
    setEditingDocId(doc.id)
    setDocForm({
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      content: doc.content,
      category: doc.category,
      sortOrder: doc.sortOrder,
      isPublished: doc.isPublished,
    })
  }

  function handleDocNew() {
    setEditingDocId(null)
    setDocForm({ id: "", title: "", slug: "", content: "", category: "quickstart", sortOrder: 0, isPublished: true })
  }

  async function handleDocSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const url = editingDocId ? `/api/admin/docs/${editingDocId}` : "/api/admin/docs"
      const method = editingDocId ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(docForm) })
      if (res.ok) {
        await fetchDocs()
        handleDocNew()
      }
    } catch { console.error("保存文档失败") }
  }

  async function handleDocDelete(id: string) {
    if (!confirm("确定删除此文档？")) return
    await fetch(`/api/admin/docs/${id}`, { method: "DELETE" })
    await fetchDocs()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">站务设置</h1>
        <p className="text-muted-foreground">管理站点信息和文档</p>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === "site" ? "default" : "outline"} onClick={() => setTab("site")}>站点信息</Button>
        <Button variant={tab === "docs" ? "default" : "outline"} onClick={() => setTab("docs")}>文档设置</Button>
        <Button variant={tab === "notify" ? "default" : "outline"} onClick={() => setTab("notify")}>通知设置</Button>
      </div>

      {tab === "site" && (
        <Card>
          <CardHeader><CardTitle>站点信息</CardTitle></CardHeader>
          <CardContent>
            <form method="post" onSubmit={handleSiteSave} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>网站标题</Label>
                  <Input value={siteForm.siteTitle}
                    onChange={e => setSiteForm(prev => ({ ...prev, siteTitle: e.target.value }))}
                    placeholder="如：宁宁云IDC - 专业服务器提供商" />
                </div>
                <div className="space-y-2">
                  <Label>标签页标题</Label>
                  <Input value={siteForm.tabTitle}
                    onChange={e => setSiteForm(prev => ({ ...prev, tabTitle: e.target.value }))}
                    placeholder="浏览器标签页显示的标题" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>商家名称</Label>
                <Input value={siteForm.brandName}
                  onChange={e => setSiteForm(prev => ({ ...prev, brandName: e.target.value }))}
                  placeholder="如：宁宁云IDC" />
              </div>
              <div className="space-y-2">
                <Label>站点关键词（SEO）</Label>
                <Input value={siteForm.keywords}
                  onChange={e => setSiteForm(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="逗号分隔，如：VPS,云服务器,服务器租用" />
              </div>
              <div className="space-y-2">
                <Label>站点描述（SEO）</Label>
                <textarea className="w-full rounded-md border px-3 py-2 text-sm min-h-[60px]"
                  value={siteForm.description}
                  onChange={e => setSiteForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="站点描述..." />
              </div>
              <div className="space-y-2">
                <Label>页脚信息</Label>
                <Input value={siteForm.footer}
                  onChange={e => setSiteForm(prev => ({ ...prev, footer: e.target.value }))}
                  placeholder="如：© 2024 宁宁云IDC 版权所有" />
              </div>
              <Button type="submit" disabled={saving}>{saving ? "保存中..." : "保存设置"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "docs" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">文档列表（{docs.length} 篇）</h2>
            <Button onClick={handleDocNew} variant={editingDocId ? "outline" : "default"}>
              {editingDocId ? "新建文档" : "添加文档"}
            </Button>
          </div>

          <Card>
            <CardContent>
              <form method="post" onSubmit={handleDocSubmit} className="space-y-4 pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>标题 *</Label>
                    <Input value={docForm.title}
                      onChange={e => { const t = e.target.value; setDocForm(prev => ({ ...prev, title: t, slug: t.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim() })) }}
                      placeholder="文档标题" required />
                  </div>
                  <div className="space-y-2">
                    <Label>标识 *</Label>
                    <Input value={docForm.slug}
                      onChange={e => setDocForm(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="url-friendly-slug" required />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>分类</Label>
                    <select className="w-full rounded-md border px-3 py-2 text-sm" value={docForm.category}
                      onChange={e => setDocForm(prev => ({ ...prev, category: e.target.value }))}>
                      {docCategories.map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>排序</Label>
                    <Input type="number" value={docForm.sortOrder}
                      onChange={e => setDocForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="pub" checked={docForm.isPublished}
                      onChange={e => setDocForm(prev => ({ ...prev, isPublished: e.target.checked }))} />
                    <Label htmlFor="pub">发布</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>内容 *</Label>
                  <textarea className="w-full rounded-md border px-3 py-2 text-sm min-h-[200px]"
                    value={docForm.content}
                    onChange={e => setDocForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="文档正文内容（支持 Markdown）" required />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editingDocId ? "更新文档" : "创建文档"}</Button>
                  {editingDocId && <Button type="button" variant="outline" onClick={handleDocNew}>取消编辑</Button>}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {docs.map(doc => (
              <Card key={doc.id} className={editingDocId === doc.id ? "border-primary" : ""}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{doc.title}</span>
                      <span className="text-xs text-muted-foreground">{doc.slug}</span>
                      <span className="px-1.5 py-0.5 bg-muted rounded text-xs">{docCategories.find(c => c.value === doc.category)?.label || doc.category}</span>
                      {!doc.isPublished && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">草稿</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleDocEdit(doc)}>编辑</Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDocDelete(doc.id)}>删除</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "notify" && (
        <div className="space-y-6">
          <div className="flex gap-2 mb-6">
            <Button variant={notifySub === "email" ? "default" : "outline"}
              onClick={() => setNotifySub("email")}>邮件设置</Button>
            <Button variant={notifySub === "sms" ? "default" : "outline"}
              onClick={() => setNotifySub("sms")}>短信设置</Button>
          </div>

          {notifySub === "email" && (
            <Card>
              <CardHeader><CardTitle>邮件设置</CardTitle></CardHeader>
              <CardContent>
                <form method="post" onSubmit={e => { e.preventDefault(); handleSiteSave(e) }} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>SMTP 服务器</Label>
                      <Input value={siteForm.smtpHost}
                        onChange={e => setSiteForm(prev => ({ ...prev, smtpHost: e.target.value }))}
                        placeholder="smtp.example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP 端口</Label>
                      <Input value={siteForm.smtpPort}
                        onChange={e => setSiteForm(prev => ({ ...prev, smtpPort: e.target.value }))}
                        placeholder="587" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>发件人邮箱</Label>
                      <Input value={siteForm.smtpUser}
                        onChange={e => setSiteForm(prev => ({ ...prev, smtpUser: e.target.value }))}
                        placeholder="user@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>发件人密码</Label>
                      <Input type="password" value={siteForm.smtpPass}
                        onChange={e => setSiteForm(prev => ({ ...prev, smtpPass: e.target.value }))}
                        placeholder="SMTP 授权码" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>发件人名称地址</Label>
                      <Input value={siteForm.smtpFrom}
                        onChange={e => setSiteForm(prev => ({ ...prev, smtpFrom: e.target.value }))}
                        placeholder="noreply@your-domain.com" />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input type="checkbox" id="smtpSecure" checked={siteForm.smtpSecure}
                        onChange={e => setSiteForm(prev => ({ ...prev, smtpSecure: e.target.checked }))} />
                      <Label htmlFor="smtpSecure">使用 SSL/TLS</Label>
                    </div>
                  </div>
                  <Button type="submit" disabled={saving}>{saving ? "保存中..." : "保存设置"}</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {notifySub === "sms" && (
            <Card>
              <CardHeader><CardTitle>短信设置</CardTitle></CardHeader>
              <CardContent>
                <div className="py-8 text-center text-muted-foreground">
                  短信通知功能预留开发，敬请期待。
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
