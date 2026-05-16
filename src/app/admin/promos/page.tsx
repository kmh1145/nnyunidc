"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PromoCode {
  id: string; code: string; type: string; value: number; minAmount: number
  maxUseCount: number; usedCount: number; startsAt: string | null; expiresAt: string | null
  isActive: boolean; productIds: string; description: string | null
}

const typeLabels: Record<string, string> = { percent: "百分比折扣", fixed: "固定减免", override: "固定价格" }

export default function PromosPage() {
  const [promos, setPromos] = React.useState<PromoCode[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editing, setEditing] = React.useState<PromoCode | null>(null)
  const [form, setForm] = React.useState({ code: "", type: "percent", value: "", minAmount: "0", maxUseCount: "0", startsAt: "", expiresAt: "", productIds: "", description: "", isActive: true })

  React.useEffect(() => { fetchPromos() }, [])

  async function fetchPromos() {
    const r = await fetch("/api/admin/promos")
    if (r.ok) setPromos(await r.json())
    setLoading(false)
  }

  function handleEdit(p: PromoCode) {
    setEditing(p)
    setForm({ code: p.code, type: p.type, value: p.value.toString(), minAmount: p.minAmount.toString(), maxUseCount: p.maxUseCount.toString(), startsAt: p.startsAt?.split("T")[0] || "", expiresAt: p.expiresAt?.split("T")[0] || "", productIds: p.productIds || "", description: p.description || "", isActive: p.isActive })
  }

  function handleNew() {
    setEditing(null)
    setForm({ code: "", type: "percent", value: "", minAmount: "0", maxUseCount: "0", startsAt: "", expiresAt: "", productIds: "", description: "", isActive: true })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = { ...form, value: parseFloat(form.value), minAmount: parseFloat(form.minAmount), maxUseCount: parseInt(form.maxUseCount) }
    const url = editing ? `/api/admin/promos/${editing.id}` : "/api/admin/promos"
    const method = editing ? "PUT" : "POST"
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (r.ok) { await fetchPromos(); handleNew() }
    else { const d = await r.json(); alert(d.error || "保存失败") }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除？")) return
    await fetch(`/api/admin/promos/${id}`, { method: "DELETE" })
    await fetchPromos()
  }

  if (loading) return <div className="container py-8">加载中...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">优惠码管理</h1><p className="text-muted-foreground">管理折扣和促销码</p></div>
        <Button onClick={handleNew}>添加优惠码</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full"><thead><tr className="border-b"><th className="text-left p-4 font-semibold">优惠码</th><th className="text-left p-4 font-semibold">类型</th><th className="text-left p-4 font-semibold">折扣</th><th className="text-left p-4 font-semibold">最低消费</th><th className="text-left p-4 font-semibold">使用次数</th><th className="text-left p-4 font-semibold">有效期</th><th className="text-left p-4 font-semibold">状态</th><th className="text-left p-4 font-semibold">操作</th></tr></thead><tbody>
            {promos.map(p => (<tr key={p.id} className="border-b"><td className="p-4 font-medium">{p.code}</td><td className="p-4">{typeLabels[p.type] || p.type}</td><td className="p-4">{p.type === "percent" ? `${p.value}%` : `¥${p.value}`}</td><td className="p-4">¥{Number(p.minAmount).toFixed(0)}</td><td className="p-4">{p.usedCount}/{p.maxUseCount || "∞"}</td><td className="p-4 text-sm">{p.startsAt ? new Date(p.startsAt).toLocaleDateString() : "-"} ~ {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "-"}</td><td className="p-4"><span className={`px-2 py-1 rounded-full text-xs ${p.isActive ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-600"}`}>{p.isActive ? "启用" : "禁用"}</span></td><td className="p-4"><div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => handleEdit(p)}>编辑</Button><Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(p.id)}>删除</Button></div></td></tr>))}
            {promos.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">暂无优惠码</td></tr>}
          </tbody></table>
        </CardContent>
      </Card>

      {(editing || form.code !== "" || promos.length === 0) && (
        <Card>
          <CardHeader><CardTitle>{editing ? "编辑优惠码" : "添加优惠码"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label>优惠码 *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER2024" required /></div>
                <div className="space-y-2"><Label>类型</Label><select className="w-full rounded-md border px-3 py-2 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="space-y-2"><Label>{form.type === "percent" ? "折扣百分比" : form.type === "override" ? "固定价格" : "减免金额"}</Label><Input type="number" min={0} max={form.type === "percent" ? 100 : undefined} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2"><Label>最低消费金额</Label><Input type="number" min={0} value={form.minAmount} onChange={e => setForm(f => ({ ...f, minAmount: e.target.value }))} /></div>
                <div className="space-y-2"><Label>最大使用次数 (0=不限)</Label><Input type="number" min={0} value={form.maxUseCount} onChange={e => setForm(f => ({ ...f, maxUseCount: e.target.value }))} /></div>
                <div className="space-y-2"><Label>开始日期</Label><Input type="date" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} /></div>
                <div className="space-y-2"><Label>结束日期</Label><Input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} /></div>
              </div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} /><Label>启用</Label></div>
              <div className="flex gap-2"><Button type="submit">{editing ? "更新" : "创建"}</Button>{editing && <Button type="button" variant="outline" onClick={handleNew}>取消</Button>}</div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
