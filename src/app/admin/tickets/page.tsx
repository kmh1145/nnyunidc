"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface Ticket {
  id: string
  subject: string
  content: string
  department: string
  priority: string
  status: string
  createdAt: string
  user: { id: string; name: string | null; email: string }
  replies: TicketReply[]
}

interface TicketReply {
  id: string
  content: string
  isAdmin: boolean
  createdAt: string
}

const departmentLabels: Record<string, string> = {
  FINANCE: "财务部门",
  TECHNICAL: "技术部门",
  AFTERSALES: "售后部门",
}

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: "待处理", color: "text-blue-600 bg-blue-50" },
  REPLIED: { label: "已回复", color: "text-green-600 bg-green-50" },
  CLOSED: { label: "已关闭", color: "text-gray-600 bg-gray-50" },
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  LOW: { label: "低", color: "text-gray-600 bg-gray-50" },
  MEDIUM: { label: "中", color: "text-orange-600 bg-orange-50" },
  HIGH: { label: "高", color: "text-red-600 bg-red-50" },
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [departmentFilter, setDepartmentFilter] = React.useState("all")
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null)
  const [replyContent, setReplyContent] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => { fetchTickets() }, [statusFilter, departmentFilter])

  async function fetchTickets() {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (departmentFilter !== "all") params.set("department", departmentFilter)
      const res = await fetch(`/api/admin/tickets?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTickets(data)
        if (selectedTicket) {
          const updated = data.find((t: Ticket) => t.id === selectedTicket.id)
          if (updated) setSelectedTicket(updated)
        }
      }
    } catch (error) {
      console.error("获取工单失败:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleReply(ticketId: string) {
    if (!replyContent.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      })
      if (res.ok) {
        setReplyContent("")
        await fetchTickets()
      }
    } catch (error) {
      console.error("回复失败:", error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCloseTicket(ticketId: string) {
    if (!confirm("确定要关闭此工单吗？")) return
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      })
      if (res.ok) {
        await fetchTickets()
        setSelectedTicket(null)
      }
    } catch (error) {
      console.error("关闭工单失败:", error)
    }
  }

  if (loading) {
    return <div className="container py-8">加载中...</div>
  }

  if (selectedTicket) {
    return (
      <div>
        <Button variant="outline" size="sm" className="mb-4" onClick={() => setSelectedTicket(null)}>
          ← 返回列表
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedTicket.subject}</CardTitle>
                <div className="mt-2 space-x-2 text-sm">
                  <span className="text-muted-foreground">
                    用户: {selectedTicket.user?.name || selectedTicket.user?.email}
                  </span>
                  <span>{departmentLabels[selectedTicket.department]}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[selectedTicket.status]?.color}`}>
                    {statusLabels[selectedTicket.status]?.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityLabels[selectedTicket.priority]?.color}`}>
                    {priorityLabels[selectedTicket.priority]?.label}
                  </span>
                </div>
              </div>
              {selectedTicket.status !== "CLOSED" && (
                <Button variant="outline" size="sm" onClick={() => handleCloseTicket(selectedTicket.id)}>关闭工单</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">
                  {new Date(selectedTicket.createdAt).toLocaleString()} - {selectedTicket.user?.name || selectedTicket.user?.email}
                </div>
                <div className="text-sm whitespace-pre-wrap">{selectedTicket.content}</div>
              </div>

              {selectedTicket.replies.map((reply) => (
                <div key={reply.id} className={`rounded-lg p-4 ${reply.isAdmin ? "bg-blue-50 ml-8" : "bg-muted/50 mr-8"}`}>
                  <div className="text-xs text-muted-foreground mb-1">
                    {new Date(reply.createdAt).toLocaleString()} - {reply.isAdmin ? "客服" : "用户"}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{reply.content}</div>
                </div>
              ))}

              {selectedTicket.status !== "CLOSED" && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>回复工单</Label>
                  <textarea
                    className="w-full rounded-md border px-3 py-2 text-sm min-h-[120px]"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="输入回复内容..."
                  />
                  <Button onClick={() => handleReply(selectedTicket.id)} disabled={submitting || !replyContent.trim()}>
                    {submitting ? "发送中..." : "发送回复"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">工单管理</h1>
        <p className="text-muted-foreground">处理用户工单</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <div className="space-x-1">
              {[
                { value: "all", label: "全部" },
                { value: "OPEN", label: "待处理" },
                { value: "REPLIED", label: "已回复" },
                { value: "CLOSED", label: "已关闭" },
              ].map(f => (
                <Button key={f.value} variant={statusFilter === f.value ? "default" : "outline"} size="sm"
                  onClick={() => setStatusFilter(f.value)}>{f.label}</Button>
              ))}
            </div>
            <div className="w-px bg-border" />
            <div className="space-x-1">
              {[
                { value: "all", label: "全部部门" },
                { value: "FINANCE", label: "财务" },
                { value: "TECHNICAL", label: "技术" },
                { value: "AFTERSALES", label: "售后" },
              ].map(f => (
                <Button key={f.value} variant={departmentFilter === f.value ? "default" : "outline"} size="sm"
                  onClick={() => setDepartmentFilter(f.value)}>{f.label}</Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">主题</th>
                  <th className="text-left p-4 font-semibold">用户</th>
                  <th className="text-left p-4 font-semibold">部门</th>
                  <th className="text-left p-4 font-semibold">优先级</th>
                  <th className="text-left p-4 font-semibold">状态</th>
                  <th className="text-left p-4 font-semibold">时间</th>
                  <th className="text-left p-4 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedTicket(ticket)}>
                    <td className="p-4 font-medium">{ticket.subject}</td>
                    <td className="p-4 text-sm">{ticket.user?.name || ticket.user?.email}</td>
                    <td className="p-4 text-sm">{departmentLabels[ticket.department]}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityLabels[ticket.priority]?.color}`}>
                        {priorityLabels[ticket.priority]?.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabels[ticket.status]?.color}`}>
                        {statusLabels[ticket.status]?.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <Button variant="outline" size="sm">查看</Button>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">暂无工单</td>
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
