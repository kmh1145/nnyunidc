"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface EmailTemplate { id: string; code: string; name: string; subject: string; content: string; isActive: boolean }

const templateCodes = [
  { code: "order_created", name: "订单创建通知" },
  { code: "order_paid", name: "支付成功通知" },
  { code: "server_created", name: "服务器开通通知" },
  { code: "server_expiring", name: "服务器到期提醒" },
  { code: "password_reset", name: "密码重置" },
  { code: "ticket_reply", name: "工单回复通知" },
  { code: "welcome", name: "注册欢迎邮件" },
]

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editing, setEditing] = React.useState<EmailTemplate | null>(null)
  const [form, setForm] = React.useState({ code: "", name: "", subject: "", content: "", isActive: true })

  React.useEffect(() => { fetchTemplates() }, [])

  async function fetchTemplates() {
    const r = await fetch("/api/admin/email-templates")
    if (r.ok) setTemplates(await r.json())
    setLoading(false)
  }

  function handleEdit(t: EmailTemplate) { setEditing(t); setForm({ code: t.code, name: t.name, subject: t.subject, content: t.content, isActive: t.isActive }) }

  function handleNew(tc?: { code: string; name: string }) {
    setEditing(null)
    if (tc) setForm({ code: tc.code, name: tc.name, subject: "", content: "", isActive: true })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editing ? `/api/admin/email-templates/${editing.id}` : "/api/admin/email-templates"
    const r = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (r.ok) { await fetchTemplates(); setEditing(null) }
  }

  if (loading) return <div className="container py-8">加载中...</div>

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">邮件模板</h1><p className="text-muted-foreground">管理系统邮件通知模板</p></div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templateCodes.map(tc => {
          const t = templates.find(x => x.code === tc.code)
          return (
            <Card key={tc.code}>
              <CardHeader><CardTitle className="text-base">{tc.name}</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  {t ? (t.isActive ? "已配置" : "已禁用") : "未配置"} | 标识: {tc.code}
                </div>
                <Button variant="outline" size="sm" onClick={() => t ? handleEdit(t) : handleNew(tc)}>
                  {t ? "编辑" : "添加"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {(editing || form.code) && (
        <Card>
          <CardHeader><CardTitle>{editing ? "编辑" : "添加"}邮件模板</CardTitle></CardHeader>
          <CardContent><form method="post" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>模板名称</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>标识</Label><Input value={form.code} disabled placeholder="自动生成" /></div>
            </div>
            <div className="space-y-2"><Label>邮件主题</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required placeholder="支持变量 {{变量名}}" /></div>
            <div className="space-y-2"><Label>邮件内容 (HTML)</Label><textarea className="w-full rounded-md border px-3 py-2 text-sm min-h-[200px] font-mono" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required placeholder="支持变量 {{变量名}}" /></div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />启用</label>
            <p className="text-xs text-muted-foreground">可用变量：{"{{siteTitle}} {{brandName}} {{orderId}} {{hostname}} {{ipAddress}} {{username}} {{password}} {{amount}} {{expiresAt}} {{resetLink}} {{ticketSubject}}"}</p>
            <div className="flex gap-2"><Button type="submit">{editing ? "更新" : "创建"}</Button><Button type="button" variant="outline" onClick={() => { setEditing(null); setForm({ code: "", name: "", subject: "", content: "", isActive: true }) }}>取消</Button></div>
          </form></CardContent></Card>
      )}
    </div>
  )
}
