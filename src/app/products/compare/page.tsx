"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const products = [
  {
    id: 1,
    name: "入门型 VPS",
    slug: "starter-vps",
    price: 49,
    specs: {
      CPU: "1 核",
      内存: "1GB",
      存储: "20GB SSD",
      流量: "1TB",
      带宽: "100Mbps",
    },
  },
  {
    id: 2,
    name: "标准型 VPS",
    slug: "standard-vps",
    price: 99,
    specs: {
      CPU: "2 核",
      内存: "4GB",
      存储: "50GB SSD",
      流量: "2TB",
      带宽: "200Mbps",
    },
  },
  {
    id: 3,
    name: "高性能 VPS",
    slug: "premium-vps",
    price: 199,
    specs: {
      CPU: "4 核",
      内存: "8GB",
      存储: "100GB SSD",
      流量: "4TB",
      带宽: "500Mbps",
    },
  },
]

const specKeys = ["CPU", "内存", "存储", "流量", "带宽"]

export default function ComparePage() {
  const [selectedProducts, setSelectedProducts] = React.useState<number[]>(
    products.map((p) => p.id)
  )

  const toggleProduct = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [...prev, id]
    )
  }

  const filteredProducts = products.filter((p) =>
    selectedProducts.includes(p.id)
  )

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">产品对比</h1>
        <p className="text-muted-foreground">
          对比不同服务器方案的配置和价格
        </p>
      </div>

      <div className="mb-6">
        <h2 className="font-semibold mb-3">选择要对比的产品</h2>
        <div className="flex flex-wrap gap-2">
          {products.map((product) => (
            <Button
              key={product.id}
              variant={selectedProducts.includes(product.id) ? "default" : "outline"}
              onClick={() => toggleProduct(product.id)}
            >
              {product.name}
            </Button>
          ))}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">请至少选择一个产品进行对比</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-semibold">配置</th>
                {filteredProducts.map((product) => (
                  <th key={product.id} className="text-center p-4 font-semibold">
                    {product.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4 text-muted-foreground">价格</td>
                {filteredProducts.map((product) => (
                  <td key={product.id} className="text-center p-4">
                    <span className="text-2xl font-bold">¥{product.price}</span>
                    <span className="text-muted-foreground">/月</span>
                  </td>
                ))}
              </tr>
              {specKeys.map((key) => (
                <tr key={key} className="border-b">
                  <td className="p-4 text-muted-foreground">{key}</td>
                  {filteredProducts.map((product) => (
                    <td key={product.id} className="text-center p-4">
                      {product.specs[key as keyof typeof product.specs]}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="p-4"></td>
                {filteredProducts.map((product) => (
                  <td key={product.id} className="text-center p-4">
                    <Button asChild>
                      <Link href={`/products/${product.slug}`}>
                        立即购买
                      </Link>
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
