"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Server {
  id: string
  serverId: string | null
  hostname: string | null
  ipAddress: string | null
  platform: string
  status: string
  config: any
  expiresAt: string | null
  createdAt: string
  user: { id: string; name: string | null; email: string }
  order: { id: string; totalAmount: number } | null
}

const statusColors: Record<string, string> = {
  RUNNING: "bg-green-50 text-green-600",
  STOPPED: "bg-orange-50 text-orange-600",
  ERROR: "bg-red-50 text-red-600",
  CREATING: "bg-blue-50 text-blue-600",
  EXPIRED: "bg-gray-50 text-gray-600",
}

const statusLabels: Record<string, string> = {
  RUNNING: "运行中",
  STOPPED: "已停止",
  ERROR: "异常",
  CREATING: "创建中",
  EXPIRED: "已过期",
}

export default function AdminServersPage() {
  const [servers, setServers] = React.useState<Server[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [platformFilter, setPlatformFilter] = React.useState("all")
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetchServers()
  }, [])

  async function fetchServers() {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set("search", searchQuery)
      if (platformFilter !== "all") params.set("platform", platformFilter)

      const res = await fetch(`/api/admin/servers?${params}`)
      if (res.ok) {
        const data = await res.json()
        setServers(data)
      }
    } catch (error) {
      console.error("获取服务器列表失败:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(serverId: string, action: string) {
    setActionLoading(serverId)
    try {
      const res = await fetch(`/api/admin/servers/${serverId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        await fetchServers()
      } else {
        const data = await res.json()
        alert(data.error || "操作失败")
      }
    } catch (error) {
      console.error(`${action} 失败:`, error)
      alert("操作失败，请重试")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(serverId: string) {
    if (!confirm("确定要删除此服务器吗？")) return
    try {
      const res = await fetch(`/api/admin/servers/${serverId}`, { method: "DELETE" })
      if (res.ok) {
        await fetchServers()
      } else {
        const data = await res.json()
        alert(data.error || "删除失败")
      }
    } catch (error) {
      console.error("删除失败:", error)
    }
  }

  const filteredServers = servers

  if (loading) {
    return <div className="container py-8">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">服务器管理</h1>
        <p className="text-muted-foreground">管理所有服务器</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Input
              placeholder="搜索主机名或IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchServers()}
              className="max-w-sm"
            />
            <div className="flex gap-2">
              {[
                { value: "all", label: "全部" },
                { value: "PVE", label: "PVE" },
                { value: "ALIYUN", label: "阿里云" },
              ].map((f) => (
                <Button
                  key={f.value}
                  variant={platformFilter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setPlatformFilter(f.value); setTimeout(fetchServers, 0) }}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">主机名</th>
                  <th className="text-left p-4 font-semibold">IP地址</th>
                  <th className="text-left p-4 font-semibold">用户</th>
                  <th className="text-left p-4 font-semibold">平台</th>
                  <th className="text-left p-4 font-semibold">状态</th>
                  <th className="text-left p-4 font-semibold">到期时间</th>
                  <th className="text-left p-4 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredServers.map((server) => (
                  <tr key={server.id} className="border-b">
                    <td className="p-4">
                      <div className="font-medium">{server.hostname || "未命名"}</div>
                      <div className="text-xs text-muted-foreground">{server.serverId}</div>
                    </td>
                    <td className="p-4">{server.ipAddress || "未分配"}</td>
                    <td className="p-4">{server.user?.name || server.user?.email || "未知"}</td>
                    <td className="p-4">{server.platform}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[server.status]}`}>
                        {statusLabels[server.status] || server.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {server.expiresAt ? new Date(server.expiresAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {server.status === "STOPPED" && (
                          <Button variant="outline" size="sm" disabled={actionLoading === server.id}
                            onClick={() => handleAction(server.id, "start")}>
                            {actionLoading === server.id ? "..." : "启动"}
                          </Button>
                        )}
                        {server.status === "RUNNING" && (
                          <>
                            <Button variant="outline" size="sm" disabled={actionLoading === server.id}
                              onClick={() => handleAction(server.id, "shutdown")}>
                              关机
                            </Button>
                            <Button variant="outline" size="sm" disabled={actionLoading === server.id}
                              onClick={() => handleAction(server.id, "restart")}>
                              重启
                            </Button>
                          </>
                        )}
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(server.id)}>
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredServers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      暂无服务器
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
