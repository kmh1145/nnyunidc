"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// 示例订单数据
const orders = [
  {
    id: "ORD-001",
    date: "2024-01-15",
    total: "¥99.00",
    status: "已完成",
    items: ["标准型 VPS x 1"],
  },
  {
    id: "ORD-002",
    date: "2024-01-10",
    total: "¥199.00",
    status: "处理中",
    items: ["高性能 VPS x 1"],
  },
]

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">我的订单</h1>
        <p className="text-muted-foreground">查看您的订单历史</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">暂无订单记录</p>
            <Button asChild>
              <Link href="/products">浏览产品</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">订单号：{order.id}</CardTitle>
                    <CardDescription>{order.date}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{order.total}</div>
                    <div className={`text-sm ${
                      order.status === "已完成" ? "text-green-600" : "text-orange-600"
                    }`}>
                      {order.status}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {order.items.join(", ")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
