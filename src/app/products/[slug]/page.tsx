"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCart } from "@/lib/cart-context"

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  originalPrice: number | null
  stock: number
  isActive: boolean
  images: string[]
  specs: {
    platform: string
    cpu: number
    memory: number
    disk: number
    bandwidth: number
    ipCount: number
    osOptions: string[]
  } | null
  category: { id: string; name: string; slug: string }
}

const osLabels: Record<string, string> = {
  "ubuntu-22.04": "Ubuntu 22.04 LTS",
  "ubuntu-24.04": "Ubuntu 24.04 LTS",
  "debian-12": "Debian 12",
  "centos-9": "CentOS 9 Stream",
  "rocky-9": "Rocky Linux 9",
  "almalinux-9": "AlmaLinux 9",
  "windows-2022": "Windows Server 2022",
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { addItem } = useCart()
  const [product, setProduct] = React.useState<Product | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${slug}`)
        if (res.ok) {
          setProduct(await res.json())
        }
      } catch (error) {
        console.error("获取产品失败:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [slug])

  const handleAddToCart = () => {
    if (!product) return
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      period: "/月",
    })
    router.push("/cart")
  }

  const handleBuyNow = () => {
    if (!product) return
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      period: "/月",
    })
    router.push("/checkout")
  }

  if (loading) return <div className="container py-8">加载中...</div>

  if (!product) {
    return (
      <div className="container py-8 px-4 md:px-6 text-center">
        <h1 className="text-2xl font-bold mb-4">产品未找到</h1>
        <p className="text-muted-foreground mb-4">您查找的产品不存在</p>
        <Button asChild>
          <Link href="/products">返回产品列表</Link>
        </Button>
      </div>
    )
  }

  const specs = product.specs

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="mb-6">
        <Link href="/products" className="text-sm text-muted-foreground hover:text-primary">
          ← 返回产品列表
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <Card>
            <CardHeader>
              <div className="text-xs text-muted-foreground mb-1">{product.category.name}</div>
              <CardTitle className="text-2xl">{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">¥{Number(product.price).toFixed(1)}</span>
                <span className="text-muted-foreground text-lg">/月</span>
                {product.originalPrice && (
                  <span className="ml-3 text-lg text-muted-foreground line-through">
                    ¥{Number(product.originalPrice).toFixed(1)}
                  </span>
                )}
              </div>

              <p className="text-muted-foreground mb-6">{product.description}</p>

              {specs && (
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <svg className="mr-3 h-5 w-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {specs.cpu} 核 CPU
                  </li>
                  <li className="flex items-center">
                    <svg className="mr-3 h-5 w-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {specs.memory}GB 内存
                  </li>
                  <li className="flex items-center">
                    <svg className="mr-3 h-5 w-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {specs.disk}GB SSD
                  </li>
                  <li className="flex items-center">
                    <svg className="mr-3 h-5 w-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {specs.bandwidth}Mbps 带宽
                  </li>
                  {specs.ipCount > 1 && (
                    <li className="flex items-center">
                      <svg className="mr-3 h-5 w-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {specs.ipCount} 个 IPv4
                    </li>
                  )}
                </ul>
              )}

              <div className="text-sm text-muted-foreground mb-6">
                库存: {product.stock > 999 ? "充足" : `${product.stock} 台`}
              </div>

              <div className="flex gap-4">
                <Button size="lg" className="flex-1" onClick={handleBuyNow}>立即购买</Button>
                <Button size="lg" variant="outline" className="flex-1" onClick={handleAddToCart}>加入购物车</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {specs && (
            <Card>
              <CardHeader>
                <CardTitle>配置详情</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">平台</span><span className="font-medium">{specs.platform}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">CPU</span><span className="font-medium">{specs.cpu} 核</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">内存</span><span className="font-medium">{specs.memory} GB</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">系统盘</span><span className="font-medium">{specs.disk} GB SSD</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">带宽</span><span className="font-medium">{specs.bandwidth} Mbps</span></div>
                  <div className="flex justify-between py-2"><span className="text-muted-foreground">IP 数量</span><span className="font-medium">{specs.ipCount || 1} 个</span></div>
                </div>
              </CardContent>
            </Card>
          )}

          {specs?.osOptions?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>可选操作系统</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {specs.osOptions.map((os: string) => (
                    <div key={os} className="text-sm py-1">{osLabels[os] || os}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {specs?.guarantees?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>服务保障</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {specs.guarantees.map((g: { title: string; description: string }, i: number) => (
                    <li key={i} className="flex items-center">
                      <svg className="mr-3 h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {g.title}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
