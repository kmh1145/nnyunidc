"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const users = [
  {
    id: "1",
    name: "张三",
    email: "zhangsan@example.com",
    phone: "13800138001",
    role: "USER",
    orders: 5,
    servers: 3,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "李四",
    email: "lisi@example.com",
    phone: "13800138002",
    role: "USER",
    orders: 3,
    servers: 2,
    createdAt: "2024-01-05",
  },
  {
    id: "3",
    name: "王五",
    email: "wangwu@example.com",
    phone: "13800138003",
    role: "ADMIN",
    orders: 0,
    servers: 0,
    createdAt: "2024-01-10",
  },
  {
    id: "4",
    name: "赵六",
    email: "zhaoliu@example.com",
    phone: "13800138004",
    role: "USER",
    orders: 8,
    servers: 5,
    createdAt: "2024-01-15",
  },
]

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone.includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="text-muted-foreground">管理所有用户</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Input
              placeholder="搜索用户..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">用户</th>
                  <th className="text-left p-4 font-semibold">手机号</th>
                  <th className="text-left p-4 font-semibold">角色</th>
                  <th className="text-left p-4 font-semibold">订单数</th>
                  <th className="text-left p-4 font-semibold">服务器数</th>
                  <th className="text-left p-4 font-semibold">注册时间</th>
                  <th className="text-left p-4 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="p-4">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </td>
                    <td className="p-4">{user.phone}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === "ADMIN"
                            ? "bg-purple-50 text-purple-600"
                            : "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {user.role === "ADMIN" ? "管理员" : "普通用户"}
                      </span>
                    </td>
                    <td className="p-4">{user.orders}</td>
                    <td className="p-4">{user.servers}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {user.createdAt}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          查看
                        </Button>
                        <Button variant="outline" size="sm">
                          禁用
                        </Button>
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
