"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const orders = [
  {
    id: "ORD-001",
    user: "张三",
    email: "zhangsan@example.com",
    amount: 99,
    status: "completed",
    createdAt: "2024-01-15 10:30",
  },
  {
    id: "ORD-002",
    user: "李四",
    email: "lisi@example.com",
    amount: 199,
    status: "paid",
    createdAt: "2024-01-15 11:45",
  },
  {
    id: "ORD-003",
    user: "王五",
    email: "wangwu@example.com",
    amount: 399,
    status: "pending",
    createdAt: "2024-01-15 14:20",
  },
  {
    id: "ORD-004",
    user: "赵六",
    email: "zhaoliu@example.com",
    amount: 49,
    status: "cancelled",
    createdAt: "2024-01-15 16:00",
  },
]

const statusColors: Record<string, string> = {
  completed: "bg-green-50 text-green-600",
  paid: "bg-blue-50 text-blue-600",
  pending: "bg-orange-50 text-orange-600",
  cancelled: "bg-red-50 text-red-600",
}

const statusLabels: Record<string, string> = {
  completed: "已完成",
  paid: "已支付",
  pending: "待支付",
  cancelled: "已取消",
}

export default function AdminOrdersPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">订单管理</h1>
        <p className="text-muted-foreground">管理所有订单</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Input
              placeholder="搜索订单..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                全部
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
              >
                待支付
              </Button>
              <Button
                variant={statusFilter === "paid" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("paid")}
              >
                已支付
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("completed")}
              >
                已完成
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">订单号</th>
                  <th className="text-left p-4 font-semibold">用户</th>
                  <th className="text-left p-4 font-semibold">金额</th>
                  <th className="text-left p-4 font-semibold">状态</th>
                  <th className="text-left p-4 font-semibold">创建时间</th>
                  <th className="text-left p-4 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="p-4 font-medium">{order.id}</td>
                    <td className="p-4">
                      <div>{order.user}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.email}
                      </div>
                    </td>
                    <td className="p-4">¥{order.amount}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statusColors[order.status]
                        }`}
                      >
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {order.createdAt}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/orders/${order.id}`}>查看</Link>
                        </Button>
                        {order.status === "paid" && (
                          <Button size="sm">开通服务器</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
