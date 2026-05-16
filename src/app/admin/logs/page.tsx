"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface LogEntry { id: string; type: string; action: string; content: string | null; userId: string | null; ip: string | null; createdAt: string }

const typeLabels: Record<string, { label: string; color: string }> = {
  admin: { label: "管理员操作", color: "bg-blue-50 text-blue-600" },
  login: { label: "登录日志", color: "bg-green-50 text-green-600" },
  order: { label: "订单操作", color: "bg-orange-50 text-orange-600" },
  server: { label: "服务器操作", color: "bg-purple-50 text-purple-600" },
  payment: { label: "支付日志", color: "bg-yellow-50 text-yellow-600" },
  system: { label: "系统日志", color: "bg-gray-50 text-gray-600" },
  ticket: { label: "工单日志", color: "bg-pink-50 text-pink-600" },
}

export default function LogsPage() {
  const [logs, setLogs] = React.useState<LogEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [page, setPage] = React.useState(1)

  React.useEffect(() => { fetchLogs() }, [typeFilter, page])

  async function fetchLogs() {
    const params = new URLSearchParams({ page: page.toString(), limit: "50" })
    if (typeFilter !== "all") params.set("type", typeFilter)
    const r = await fetch(`/api/admin/logs?${params}`)
    if (r.ok) setLogs(await r.json())
    setLoading(false)
  }

  if (loading) return <div className="container py-8">加载中...</div>

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">系统日志</h1><p className="text-muted-foreground">查看系统操作记录</p></div>

      <div className="flex gap-2 flex-wrap">
        {[{ value: "all", label: "全部" }, ...Object.entries(typeLabels).map(([k, v]) => ({ value: k, label: v.label }))].map(f => (
          <Button key={f.value} variant={typeFilter === f.value ? "default" : "outline"} size="sm" onClick={() => { setTypeFilter(f.value); setPage(1) }}>{f.label}</Button>
        ))}
      </div>

      <Card><CardContent className="p-0">
        <table className="w-full"><thead><tr className="border-b"><th className="text-left p-4 font-semibold">类型</th><th className="text-left p-4 font-semibold">操作</th><th className="text-left p-4 font-semibold">详情</th><th className="text-left p-4 font-semibold">用户</th><th className="text-left p-4 font-semibold">IP</th><th className="text-left p-4 font-semibold">时间</th></tr></thead><tbody>
          {logs.map(l => (<tr key={l.id} className="border-b"><td className="p-4"><span className={`px-2 py-1 rounded-full text-xs ${typeLabels[l.type]?.color || ""}`}>{typeLabels[l.type]?.label || l.type}</span></td><td className="p-4 text-sm">{l.action}</td><td className="p-4 text-sm max-w-xs truncate">{l.content || "-"}</td><td className="p-4 text-sm">{l.userId?.slice(-8) || "-"}</td><td className="p-4 text-sm font-mono">{l.ip || "-"}</td><td className="p-4 text-sm">{new Date(l.createdAt).toLocaleString()}</td></tr>))}
          {logs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">暂无日志</td></tr>}
        </tbody></table>
      </CardContent></Card>

      <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button variant="outline" size="sm" disabled={logs.length < 50} onClick={() => setPage(p => p + 1)}>下一页</Button></div>
    </div>
  )
}
