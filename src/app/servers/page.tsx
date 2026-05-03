"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// 示例服务器数据
const servers = [
  {
    id: "srv-001",
    hostname: "vps-abc123",
    ipAddress: "192.168.1.100",
    status: "running",
    platform: "PVE",
    expiresAt: "2024-02-15",
  },
  {
    id: "srv-002",
    hostname: "vps-def456",
    ipAddress: "192.168.1.101",
    status: "stopped",
    platform: "ALIYUN",
    expiresAt: "2024-02-20",
  },
]

const statusColors: Record<string, string> = {
  running: "text-green-600 bg-green-50",
  stopped: "text-orange-600 bg-orange-50",
  error: "text-red-600 bg-red-50",
  creating: "text-blue-600 bg-blue-50",
}

export default function ServersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return <div className="container py-8">加载中...</div>
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">我的服务器</h1>
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
          {servers.map((server) => (
            <Card key={server.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{server.hostname}</CardTitle>
                    <CardDescription>{server.ipAddress}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statusColors[server.status] || "text-gray-600 bg-gray-50"
                      }`}
                    >
                      {server.status === "running"
                        ? "运行中"
                        : server.status === "stopped"
                        ? "已停止"
                        : server.status === "error"
                        ? "异常"
                        : "创建中"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {server.platform}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    到期时间：{server.expiresAt}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      启动
                    </Button>
                    <Button variant="outline" size="sm">
                      停止
                    </Button>
                    <Button variant="outline" size="sm">
                      重启
                    </Button>
                    <Button variant="outline" size="sm">
                      控制台
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
