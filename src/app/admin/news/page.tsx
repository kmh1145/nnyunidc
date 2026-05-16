"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface NewsArticle { id: string; title: string; slug: string; content: string; summary: string | null; isPublished: boolean; isTop: boolean; category: { id: string; name: string; slug: string } }
interface Category { id: string; name: string; slug: string; _count?: { articles: number } }

export default function NewsPage() {
  const [articles, setArticles] = React.useState<NewsArticle[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState<"articles" | "categories">("articles")
  const [editing, setEditing] = React.useState<NewsArticle | null>(null)
  const [catForm, setCatForm] = React.useState({ name: "", slug: "", description: "" })
  const [form, setForm] = React.useState({ title: "", slug: "", content: "", summary: "", categoryId: "", isPublished: true, isTop: false, sortOrder: 0 })

  React.useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [ar, cr] = await Promise.all([fetch("/api/admin/news"), fetch("/api/admin/news-categories")])
    if (ar.ok) setArticles(await ar.json())
    if (cr.ok) setCategories(await cr.json())
    setLoading(false)
  }

  function handleEdit(a: NewsArticle) {
    setEditing(a)
    setForm({ title: a.title, slug: a.slug, content: a.content, summary: a.summary || "", categoryId: a.category.id, isPublished: a.isPublished, isTop: a.isTop, sortOrder: 0 })
  }

  function handleNew() { setEditing(null); setForm({ title: "", slug: "", content: "", summary: "", categoryId: categories[0]?.id || "", isPublished: true, isTop: false, sortOrder: 0 }) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editing ? `/api/admin/news/${editing.id}` : "/api/admin/news"
    const r = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (r.ok) { await fetchData(); handleNew() }
  }

  async function handleDelete(id: string) { if (!confirm("确定删除？")) return; await fetch(`/api/admin/news/${id}`, { method: "DELETE" }); await fetchData() }

  async function handleCatSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/admin/news-categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(catForm) })
    setCatForm({ name: "", slug: "", description: "" })
    await fetchData()
  }

  if (loading) return <div className="container py-8">加载中...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">新闻管理</h1><p className="text-muted-foreground">管理网站公告和新闻</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTab("categories")}>管理分类</Button>
          <Button onClick={handleNew}>添加新闻</Button>
        </div>
      </div>

      <div className="flex gap-2"><Button variant={tab === "articles" ? "default" : "outline"} size="sm" onClick={() => setTab("articles")}>新闻列表</Button><Button variant={tab === "categories" ? "default" : "outline"} size="sm" onClick={() => setTab("categories")}>新闻分类</Button></div>

      {tab === "categories" && (
        <Card>
          <CardHeader><CardTitle>新闻分类</CardTitle></CardHeader>
          <CardContent>
            <form method="post" onSubmit={handleCatSubmit} className="space-y-4 mb-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label>名称 *</Label><Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") }))} required /></div>
                <div className="space-y-2"><Label>标识 *</Label><Input value={catForm.slug} onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))} required /></div>
                <div className="flex items-end pb-1"><Button type="submit" size="sm">添加分类</Button></div>
              </div>
            </form>
            <div className="space-y-2">
              {categories.map(c => (<div key={c.id} className="flex justify-between items-center p-3 border rounded"><div><span className="font-medium">{c.name}</span><span className="text-sm text-muted-foreground ml-2">{c.slug}</span></div><Button variant="ghost" size="sm" className="text-red-500" onClick={async () => { await fetch(`/api/admin/news-categories/${c.id}`, { method: "DELETE" }); fetchData() }}>删除</Button></div>))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "articles" && (
        <>
          <Card><CardContent className="p-0">
            <table className="w-full"><thead><tr className="border-b"><th className="text-left p-4 font-semibold">标题</th><th className="text-left p-4 font-semibold">分类</th><th className="text-left p-4 font-semibold">置顶</th><th className="text-left p-4 font-semibold">状态</th><th className="text-left p-4 font-semibold">操作</th></tr></thead><tbody>
              {articles.map(a => (<tr key={a.id} className="border-b"><td className="p-4 font-medium">{a.title}</td><td className="p-4">{a.category?.name}</td><td className="p-4">{a.isTop ? "是" : "-"}</td><td className="p-4"><span className={`px-2 py-1 rounded-full text-xs ${a.isPublished ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-600"}`}>{a.isPublished ? "已发布" : "草稿"}</span></td><td className="p-4"><div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => handleEdit(a)}>编辑</Button><Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(a.id)}>删除</Button></div></td></tr>))}
            </tbody></table>
          </CardContent></Card>

          {(editing || form.title !== "" || articles.length === 0) && (
            <Card><CardHeader><CardTitle>{editing ? "编辑新闻" : "添加新闻"}</CardTitle></CardHeader>
              <CardContent><form method="post" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>标题 *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") }))} required /></div>
                  <div className="space-y-2"><Label>标识 *</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required /></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>分类</Label><select className="w-full rounded-md border px-3 py-2 text-sm" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div className="space-y-2"><Label>摘要</Label><Input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>内容</Label><textarea className="w-full rounded-md border px-3 py-2 text-sm min-h-[200px]" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required /></div>
                <div className="flex gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={form.isTop} onChange={e => setForm(f => ({ ...f, isTop: e.target.checked }))} />置顶</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} />发布</label></div>
                <div className="flex gap-2"><Button type="submit">{editing ? "更新" : "创建"}</Button>{editing && <Button type="button" variant="outline" onClick={handleNew}>取消</Button>}</div>
              </form></CardContent></Card>
          )}
        </>
      )}
    </div>
  )
}
