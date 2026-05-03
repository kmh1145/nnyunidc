"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  originalPrice: number | null
  stock: number
  isActive: boolean
  sortOrder: number
  specs: any
  category: { id: string; name: string; slug: string; sortOrder: number }
}

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  sortOrder: number
  _count: { products: number }
}

export default function AdminProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [collapsedCategories, setCollapsedCategories] = React.useState<Set<string>>(new Set())
  const [showCategoryForm, setShowCategoryForm] = React.useState(false)
  const [catForm, setCatForm] = React.useState({ name: "", slug: "", description: "" })
  const [dragCatId, setDragCatId] = React.useState<string | null>(null)
  const [dragProdId, setDragProdId] = React.useState<string | null>(null)

  React.useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [productsRes, catsRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/categories"),
      ])
      if (productsRes.ok) setProducts(await productsRes.json())
      if (catsRes.ok) setCategories(await catsRes.json())
    } catch { console.error("获取数据失败") }
    finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除此产品吗？")) return
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" })
    await fetchData()
  }

  async function handleToggleStatus(id: string, currentStatus: boolean) {
    await fetch(`/api/admin/products/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentStatus }),
    })
    await fetchData()
  }

  async function handleDeleteCategory(id: string, name: string, productCount: number) {
    if (productCount > 0) { alert(`分类"${name}"下还有 ${productCount} 个产品`); return }
    if (!confirm(`删除分类"${name}"？`)) return
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" })
    await fetchData()
  }

  function generateSlug(s: string) { return s.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim() }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/admin/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catForm),
    })
    setShowCategoryForm(false)
    setCatForm({ name: "", slug: "", description: "" })
    await fetchData()
  }

  function toggleCategory(catSlug: string) {
    setCollapsedCategories(prev => { const n = new Set(prev); n.has(catSlug) ? n.delete(catSlug) : n.add(catSlug); return n })
  }

  // 分类拖拽排序
  function handleCategoryDragStart(catId: string) { setDragCatId(catId) }
  function handleCategoryDragOver(e: React.DragEvent) { e.preventDefault() }
  function handleCategoryDrop(targetId: string) {
    if (!dragCatId || dragCatId === targetId) return
    const items = [...categories]
    const fromIx = items.findIndex(c => c.id === dragCatId)
    const toIx = items.findIndex(c => c.id === targetId)
    items.splice(toIx, 0, items.splice(fromIx, 1)[0])
    const reordered = items.map((c, i) => ({ ...c, sortOrder: i }))
    setCategories(reordered)
    saveReorder("category", reordered)
  }

  // 产品拖拽排序
  function handleProductDragStart(prodId: string) { setDragProdId(prodId) }
  function handleProductDrop(catSlug: string, targetId: string) {
    if (!dragProdId || dragProdId === targetId) return
    const catProds = products.filter(p => p.category.slug === catSlug)
    const fromIx = catProds.findIndex(p => p.id === dragProdId)
    const toIx = catProds.findIndex(p => p.id === targetId)
    catProds.splice(toIx, 0, catProds.splice(fromIx, 1)[0])
    const reordered = catProds.map((p, i) => ({ id: p.id, sortOrder: i }))
    setProducts(prev => prev.map(p => { const r = reordered.find(r => r.id === p.id); return r ? { ...p, sortOrder: r.sortOrder } : p }))
    saveReorder("product", reordered)
  }

  async function saveReorder(type: string, items: { id: string; sortOrder: number }[]) {
    await fetch("/api/admin/reorder", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, items }),
    })
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const grouped = new Map<string, Product[]>()
  for (const p of filteredProducts.sort((a, b) => a.sortOrder - b.sortOrder)) {
    const key = p.category.slug
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(p)
  }

  if (loading) return <div className="container py-8">加载中...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">产品管理</h1><p className="text-muted-foreground">拖动分类和产品可排序</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategoryForm(!showCategoryForm)}>
            {showCategoryForm ? "取消" : "添加分类"}
          </Button>
          <Button asChild><Link href="/admin/products/new">添加产品</Link></Button>
        </div>
      </div>

      {showCategoryForm && (
        <Card>
          <CardHeader><h3 className="font-semibold">添加分类</h3></CardHeader>
          <CardContent>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>分类名称 *</Label>
                  <Input value={catForm.name} onChange={e => { const n = e.target.value; setCatForm(prev => ({ ...prev, name: n, slug: generateSlug(n) })) }} placeholder="如：VPS" required />
                </div>
                <div className="space-y-2">
                  <Label>分类标识 *</Label>
                  <Input value={catForm.slug} onChange={e => setCatForm(prev => ({ ...prev, slug: e.target.value }))} placeholder="如：vps" required />
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Input value={catForm.description} onChange={e => setCatForm(prev => ({ ...prev, description: e.target.value }))} placeholder="如：虚拟专用服务器" />
                </div>
              </div>
              <Button type="submit">创建分类</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <Input placeholder="搜索产品名称或标识..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-sm" />
        <span className="text-sm text-muted-foreground">共 {filteredProducts.length} 个产品</span>
      </div>

      {categories.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">暂无分类</CardContent></Card>}

      {(categories.sort((a, b) => a.sortOrder - b.sortOrder) as Category[]).map(cat => {
        const catProducts = grouped.get(cat.slug) || []
        const isCollapsed = collapsedCategories.has(cat.slug)
        return (
          <Card key={cat.id}
            draggable
            onDragStart={() => handleCategoryDragStart(cat.id)}
            onDragOver={handleCategoryDragOver}
            onDrop={() => handleCategoryDrop(cat.id)}
            className={dragCatId === cat.id ? "opacity-50" : ""}
          >
            <CardHeader className="cursor-pointer hover:bg-muted/50 flex flex-row items-center justify-between"
              onClick={() => toggleCategory(cat.slug)}>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground cursor-grab text-lg" title="拖动排序">⠿</span>
                <span className="text-lg">{isCollapsed ? "▶" : "▼"}</span>
                <div>
                  <h3 className="font-semibold">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground">{cat.description || cat.slug} · {cat._count.products} 个产品</p>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                {isCollapsed && <span className="text-sm text-muted-foreground">{catProducts.length} 项</span>}
                <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeleteCategory(cat.id, cat.name, cat._count.products)}>
                  {cat._count.products > 0 ? "删除(有产品)" : "删除"}
                </Button>
              </div>
            </CardHeader>
            {!isCollapsed && (
              <CardContent>
                {catProducts.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">该分类暂无产品</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold text-sm w-8"></th>
                          <th className="text-left p-3 font-semibold text-sm">产品名称</th>
                          <th className="text-left p-3 font-semibold text-sm">配置</th>
                          <th className="text-left p-3 font-semibold text-sm">价格</th>
                          <th className="text-left p-3 font-semibold text-sm">库存</th>
                          <th className="text-left p-3 font-semibold text-sm">状态</th>
                          <th className="text-left p-3 font-semibold text-sm">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catProducts.map(product => (
                          <tr key={product.id}
                            draggable
                            onDragStart={() => handleProductDragStart(product.id)}
                            onDragOver={handleCategoryDragOver}
                            onDrop={() => handleProductDrop(cat.slug, product.id)}
                            className={`border-b ${dragProdId === product.id ? "opacity-50" : ""}`}
                          >
                            <td className="p-3"><span className="text-muted-foreground cursor-grab text-lg" title="拖动排序">⠿</span></td>
                            <td className="p-3">
                              <div className="font-medium text-sm">{product.name}</div>
                              <div className="text-xs text-muted-foreground">{product.slug}</div>
                            </td>
                            <td className="p-3">
                              {product.specs ? <div className="text-xs text-muted-foreground">{product.specs.cpu}核/{product.specs.memory}GB/{product.specs.disk}GB/{product.specs.bandwidth}M</div> : "-"}
                            </td>
                            <td className="p-3 text-sm"><div>¥{Number(product.price).toFixed(1)}</div>{product.originalPrice && <div className="text-xs text-muted-foreground line-through">¥{Number(product.originalPrice).toFixed(1)}</div>}</td>
                            <td className="p-3 text-sm">{product.stock}</td>
                            <td className="p-3">
                              <button onClick={() => handleToggleStatus(product.id, product.isActive)}
                                className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${product.isActive ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-600"}`}>
                                {product.isActive ? "上架" : "下架"}
                              </button>
                            </td>
                            <td className="p-3"><div className="flex gap-1"><Button variant="outline" size="sm" asChild><Link href={`/admin/products/${product.id}`}>编辑</Link></Button><Button variant="outline" size="sm" onClick={() => handleDelete(product.id)}>删除</Button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
