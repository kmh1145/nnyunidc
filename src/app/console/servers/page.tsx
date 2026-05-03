"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
  order: { id: string; totalAmount: number } | null
}

const statusColors: Record<string, string> = {
  RUNNING: "text-green-600 bg-green-50",
  STOPPED: "text-orange-600 bg-orange-50",
  ERROR: "text-red-600 bg-red-50",
  CREATING: "text-blue-600 bg-blue-50",
  EXPIRED: "text-gray-600 bg-gray-50",
}

const statusLabels: Record<string, string> = {
  RUNNING: "运行中",
  STOPPED: "已停止",
  ERROR: "异常",
  CREATING: "创建中",
  EXPIRED: "已过期",
}

export default function ConsoleServersPage() {
  const [servers, setServers] = React.useState<Server[]>([])
  const [loading, setLoading] = React.useState(true)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetchServers()
  }, [])

  async function fetchServers() {
    try {
      const res = await fetch("/api/servers")
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
      const res = await fetch(`/api/servers/${serverId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        await fetchServers()
      } else {
        const data = await res.json()
        alert(data.message || "操作失败")
      }
    } catch (error) {
      console.error(`${action} 失败:`, error)
      alert("操作失败，请重试")
    } finally {
      setActionLoading(null)
    }
  }

  function getSpecs(config: any) {
    if (!config) return null
    return {
      cpu: config.cpu || "-",
      memory: config.memory || "-",
      disk: config.disk || "-",
      os: config.os || "-",
    }
  }

  if (loading) {
    return <div className="container py-8">加载中...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">我的服务器</h1>
          <p className="text-muted-foreground">管理您的服务器</p>
        </div>
        <Button asChild>
          <Link href="/products">购买新服务器</Link>
        </Button>
      </div>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">暂无服务器</p>
            <Button asChild>
              <Link href="/products">浏览产品</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {servers.map((server) => {
            const specs = getSpecs(server.config)
            return (
              <Card key={server.id}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{server.hostname}</CardTitle>
                      <CardDescription>
                        {server.ipAddress || "等待分配IP...   "}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[server.status] || "text-gray-600 bg-gray-50"}`}>
                        {statusLabels[server.status] || server.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{server.platform}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {specs && (
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>{specs.cpu}核 CPU</span>
                        <span>{specs.memory}GB 内存</span>
                        <span>{specs.disk}GB 硬盘</span>
                        <span>{specs.os}</span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="text-sm text-muted-foreground">
                        到期时间：{server.expiresAt ? new Date(server.expiresAt).toLocaleDateString() : "未设置"}
                      </div>
                      <div className="flex gap-2">
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
                              {actionLoading === server.id ? "..." : "关机"}
                            </Button>
                            <Button variant="outline" size="sm" disabled={actionLoading === server.id}
                              onClick={() => handleAction(server.id, "stop")}>
                              {actionLoading === server.id ? "..." : "强制停止"}
                            </Button>
                            <Button variant="outline" size="sm" disabled={actionLoading === server.id}
                              onClick={() => handleAction(server.id, "restart")}>
                              {actionLoading === server.id ? "..." : "重启"}
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/products`}>续费</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
