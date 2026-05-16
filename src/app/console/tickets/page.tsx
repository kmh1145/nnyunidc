"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Ticket {
  id: string
  subject: string
  content: string
  department: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  replies: TicketReply[]
}

interface TicketReply {
  id: string
  content: string
  isAdmin: boolean
  createdAt: string
  userId: string
}

const departmentLabels: Record<string, { label: string; icon: string }> = {
  FINANCE: { label: "财务部门", icon: "💰" },
  TECHNICAL: { label: "技术部门", icon: "🔧" },
  AFTERSALES: { label: "售后部门", icon: "🎧" },
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

export default function TicketsPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showForm, setShowForm] = React.useState(false)
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null)
  const [replyContent, setReplyContent] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [formData, setFormData] = React.useState({
    subject: "",
    content: "",
    department: "TECHNICAL",
    priority: "MEDIUM",
  })

  React.useEffect(() => { fetchTickets() }, [])

  async function fetchTickets() {
    try {
      const res = await fetch("/api/tickets")
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

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setShowForm(false)
        setFormData({ subject: "", content: "", department: "TECHNICAL", priority: "MEDIUM" })
        await fetchTickets()
      }
    } catch (error) {
      console.error("创建工单失败:", error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReply(ticketId: string) {
    if (!replyContent.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
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
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
            ← 返回列表
          </Button>
          {selectedTicket.status !== "CLOSED" && (
            <Button variant="outline" size="sm" onClick={() => handleCloseTicket(selectedTicket.id)}>
              关闭工单
            </Button>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedTicket.subject}</CardTitle>
                <CardDescription className="mt-1 space-x-2">
                  <span>{departmentLabels[selectedTicket.department]?.icon} {departmentLabels[selectedTicket.department]?.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[selectedTicket.status]?.color}`}>
                    {statusLabels[selectedTicket.status]?.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityLabels[selectedTicket.priority]?.color}`}>
                    {priorityLabels[selectedTicket.priority]?.label}
                  </span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 原始内容 */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">
                  {new Date(selectedTicket.createdAt).toLocaleString()} - 您
                </div>
                <div className="text-sm whitespace-pre-wrap">{selectedTicket.content}</div>
              </div>

              {/* 回复列表 */}
              {selectedTicket.replies.map((reply) => (
                <div key={reply.id} className={`rounded-lg p-4 ${reply.isAdmin ? "bg-blue-50 ml-4" : "bg-muted/50 mr-4"}`}>
                  <div className="text-xs text-muted-foreground mb-1">
                    {new Date(reply.createdAt).toLocaleString()} - {reply.isAdmin ? "客服" : "您"}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{reply.content}</div>
                </div>
              ))}

              {/* 回复表单 */}
              {selectedTicket.status !== "CLOSED" && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>回复</Label>
                  <textarea
                    className="w-full rounded-md border px-3 py-2 text-sm min-h-[100px]"
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">工单管理</h1>
          <p className="text-muted-foreground">提交和查看工单</p>
        </div>
        <Button onClick={() => setShowForm(true)}>提交工单</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>提交新工单</CardTitle>
            <CardDescription>请选择对应部门，描述您遇到的问题</CardDescription>
          </CardHeader>
          <CardContent>
            <form method="post" onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="subject">主题</Label>
                  <Input id="subject" value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="简要描述问题" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">发送部门</Label>
                  <select id="department"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}>
                    <option value="TECHNICAL">🔧 技术部门</option>
                    <option value="FINANCE">💰 财务部门</option>
                    <option value="AFTERSALES">🎧 售后部门</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">优先级</Label>
                <select id="priority"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}>
                  <option value="LOW">低</option>
                  <option value="MEDIUM">中</option>
                  <option value="HIGH">高</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">详细描述</Label>
                <textarea id="content"
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[120px]"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="请详细描述您遇到的问题..." required />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>{submitting ? "提交中..." : "提交"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>取消</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">主题</th>
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
                    <td className="p-4">{departmentLabels[ticket.department]?.icon} {departmentLabels[ticket.department]?.label}</td>
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
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      暂无工单
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
