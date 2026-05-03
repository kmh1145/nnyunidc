"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const bills = [
  {
    id: "INV-2024001",
    description: "入门型 VPS - 1个月",
    amount: 49,
    status: "paid",
    createdAt: "2024-01-15",
    paidAt: "2024-01-15",
  },
  {
    id: "INV-2024002",
    description: "标准型 VPS - 1个月",
    amount: 99,
    status: "paid",
    createdAt: "2024-01-20",
    paidAt: "2024-01-20",
  },
  {
    id: "INV-2024003",
    description: "高性能 VPS - 续费",
    amount: 199,
    status: "pending",
    createdAt: "2024-02-01",
    paidAt: null,
  },
]

const statusLabels: Record<string, { label: string; color: string }> = {
  paid: { label: "已支付", color: "text-green-600 bg-green-50" },
  pending: { label: "待支付", color: "text-orange-600 bg-orange-50" },
  failed: { label: "支付失败", color: "text-red-600 bg-red-50" },
  refunded: { label: "已退款", color: "text-gray-600 bg-gray-50" },
}

export default function BillingPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">账单列表</h1>
        <p className="text-muted-foreground">查看您的消费记录和账单</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">本月消费</div>
            <div className="text-2xl font-bold">¥248.00</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">待支付</div>
            <div className="text-2xl font-bold text-orange-600">¥199.00</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">总消费</div>
            <div className="text-2xl font-bold">¥347.00</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">账单编号</th>
                  <th className="text-left p-4 font-semibold">描述</th>
                  <th className="text-left p-4 font-semibold">金额</th>
                  <th className="text-left p-4 font-semibold">状态</th>
                  <th className="text-left p-4 font-semibold">创建时间</th>
                  <th className="text-left p-4 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} className="border-b">
                    <td className="p-4 font-mono text-sm">{bill.id}</td>
                    <td className="p-4">{bill.description}</td>
                    <td className="p-4 font-medium">¥{bill.amount}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabels[bill.status].color}`}>
                        {statusLabels[bill.status].label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{bill.createdAt}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {bill.status === "pending" && (
                          <Button size="sm">去支付</Button>
                        )}
                        <Button variant="outline" size="sm">详情</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {bills.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      暂无账单记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
