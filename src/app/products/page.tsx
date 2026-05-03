"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  originalPrice: number | null
  stock: number
  isActive: boolean
  specs: any
  category: { id: string; name: string; slug: string }
}

interface Category {
  id: string
  name: string
  slug: string
  _count?: { products: number }
}

export default function ProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [productsRes, catsRes] = await Promise.all([
        fetch("/api/products?limit=100"),
        fetch("/api/admin/categories"),
      ])
      if (productsRes.ok) {
        const data = await productsRes.json()
        setProducts(data.products || [])
      }
      if (catsRes.ok) {
        setCategories(await catsRes.json())
      }
    } catch (error) {
      console.error("获取数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  function specsToFeatures(specs: any): string[] {
    if (!specs) return []
    const features: string[] = []
    if (specs.cpu) features.push(`${specs.cpu} 核 CPU`)
    if (specs.memory) features.push(`${specs.memory}GB 内存`)
    if (specs.disk) features.push(`${specs.disk}GB SSD`)
    if (specs.bandwidth) features.push(`${specs.bandwidth}Mbps 带宽`)
    if (specs.ipCount > 1) features.push(`${specs.ipCount} 个 IPv4`)
    if (specs.osOptions?.length) features.push(`${specs.osOptions.length} 种操作系统可选`)
    return features
  }

  const filteredProducts = products.filter(p => {
    if (!p.isActive) return false
    const matchesCategory = selectedCategory === "all" || p.category.slug === selectedCategory
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading) return <div className="container py-8">加载中...</div>

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">服务器产品</h1>
        <p className="text-muted-foreground">选择适合您需求的服务器方案</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-full md:w-56 space-y-4 shrink-0">
          <div>
            <Input
              placeholder="搜索产品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm px-3 py-1">产品分类</h3>
            <Button
              variant={selectedCategory === "all" ? "default" : "ghost"}
              className="w-full justify-start"
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              全部
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.slug ? "default" : "ghost"}
                className="w-full justify-start"
                size="sm"
                onClick={() => setSelectedCategory(cat.slug)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="relative">
                <CardHeader>
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">¥{Number(product.price).toFixed(1)}</span>
                    <span className="text-muted-foreground">/月</span>
                    {product.originalPrice && (
                      <span className="ml-2 text-sm text-muted-foreground line-through">
                        ¥{Number(product.originalPrice).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2 mb-4">
                    {specsToFeatures(product.specs).map((feature) => (
                      <li key={feature} className="flex items-center text-sm">
                        <svg className="mr-2 h-4 w-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="text-sm text-muted-foreground mb-4">
                    库存: {product.stock > 999 ? "充足" : `${product.stock} 台`}
                  </div>
                  <Button className="w-full" asChild>
                    <Link href={`/products/${product.slug}`}>查看详情</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">没有找到匹配的产品</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
