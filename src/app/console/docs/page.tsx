"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DocArticle {
  id: string
  title: string
  slug: string
  content: string
  category: string
}

const categoryIcons: Record<string, string> = {
  quickstart: "🚀",
  server: "🖥️",
  network: "🌐",
  faq: "❓",
}

const categoryLabels: Record<string, string> = {
  quickstart: "快速开始",
  server: "服务器管理",
  network: "网络相关",
  faq: "常见问题",
}

export default function DocsPage() {
  const [docs, setDocs] = React.useState<DocArticle[]>([])
  const [selectedDoc, setSelectedDoc] = React.useState<DocArticle | null>(null)
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch("/api/admin/docs")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setDocs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // 按分类分组
  const grouped = new Map<string, DocArticle[]>()
  for (const doc of docs) {
    if (!grouped.has(doc.category)) grouped.set(doc.category, [])
    grouped.get(doc.category)!.push(doc)
  }

  const filteredCategories = Array.from(grouped.entries()).filter(([cat, catDocs]) => {
    if (!search) return true
    return catDocs.some(d => d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.content.toLowerCase().includes(search.toLowerCase()))
  })

  if (selectedDoc) {
    return (
      <div>
        <button className="text-sm text-muted-foreground hover:text-primary mb-4 block"
          onClick={() => setSelectedDoc(null)}>← 返回文档列表</button>
        <Card>
          <CardHeader>
            <CardTitle>{selectedDoc.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {selectedDoc.content}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) return <div>加载中...</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">文档中心</h1>
        <p className="text-muted-foreground">查找使用指南和常见问题解答</p>
      </div>

      <div className="mb-6">
        <input type="text" placeholder="搜索文档..."
          className="w-full max-w-md rounded-md border px-4 py-2 text-sm"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filteredCategories.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">暂无文档</CardContent></Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {filteredCategories.map(([cat, catDocs]) => (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{categoryIcons[cat] || "📄"}</span>
                {categoryLabels[cat] || cat}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {catDocs.map(doc => (
                  <button key={doc.id}
                    className="block w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setSelectedDoc(doc)}>
                    <div className="font-medium text-sm">{doc.title}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
