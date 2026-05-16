"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewsDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [article, setArticle] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch(`/api/admin/news?slug=${slug}`).then(r => r.ok ? r.json() : null).then(d => { setArticle(d); setLoading(false) })
  }, [slug])

  if (loading) return <div className="container py-8">加载中...</div>
  if (!article) return <div className="container py-8 text-center"><h1 className="text-2xl font-bold mb-4">文章不存在</h1><Button asChild><Link href="/news">返回新闻列表</Link></Button></div>

  return (
    <div className="container py-8 px-4 md:px-6 max-w-3xl">
      <Link href="/news" className="text-sm text-muted-foreground hover:text-primary mb-4 block">← 返回新闻列表</Link>
      <Card>
        <CardHeader>
          <div className="text-sm text-muted-foreground mb-2">{article.category?.name} · {new Date(article.createdAt).toLocaleDateString()}</div>
          <CardTitle className="text-2xl">{article.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none whitespace-pre-wrap">{article.content}</div>
        </CardContent>
      </Card>
    </div>
  )
}
