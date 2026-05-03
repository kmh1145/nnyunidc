"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PaymentConfig {
  id: string
  method: string
  name: string
  credentials: Record<string, string>
  settings?: Record<string, any>
  isActive: boolean
}

const yipayTypes = [
  { value: "alipay", label: "支付宝" },
  { value: "wxpay", label: "微信支付" },
]

export default function PaymentsPage() {
  const [configs, setConfigs] = React.useState<PaymentConfig[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editingMethod, setEditingMethod] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState({
    method: "yipay",
    name: "",
    credentials: {
      apiUrl: "",
      merchantId: "",
      secretKey: "",
      defaultType: "alipay",
    } as Record<string, string>,
    isActive: true,
  })

  React.useEffect(() => { fetchConfigs() }, [])

  async function fetchConfigs() {
    try {
      const res = await fetch("/api/admin/payments")
      if (res.ok) {
        const data = await res.json()
        setConfigs(data)
      }
    } catch (error) {
      console.error("获取支付配置失败:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(config: PaymentConfig) {
    setEditingMethod(config.method)
    setFormData({
      method: config.method,
      name: config.name,
      credentials: config.credentials,
      isActive: config.isActive,
    })
  }

  function handleNew() {
    setEditingMethod(null)
    setFormData({
      method: "yipay",
      name: "",
      credentials: { apiUrl: "", merchantId: "", secretKey: "", defaultType: "alipay" },
      isActive: true,
    })
  }

  function handleCredentialChange(field: string, value: string) {
    setFormData(prev => ({
      ...prev,
      credentials: { ...prev.credentials, [field]: value },
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        await fetchConfigs()
        setEditingMethod(null)
      }
    } catch (error) {
      console.error("保存失败:", error)
    }
  }

  if (loading) {
    return <div className="container py-8">加载中...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">支付设置</h1>
          <p className="text-muted-foreground">管理易支付接口配置</p>
        </div>
        {configs.length === 0 && (
          <Button onClick={handleNew}>添加支付方式</Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {configs.map((config) => (
          <Card key={config.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{config.name || "易支付"}</CardTitle>
                  <CardDescription>
                    商户ID: {config.credentials?.merchantId || "未设置"}
                  </CardDescription>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  config.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                }`}>
                  {config.isActive ? "已启用" : "已禁用"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4 space-y-1">
                <div>API地址: {config.credentials?.apiUrl || "未设置"}</div>
                <div>默认支付方式: {yipayTypes.find(t => t.value === config.credentials?.defaultType)?.label || "支付宝"}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                编辑配置
              </Button>
            </CardContent>
          </Card>
        ))}

        {configs.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="py-8 text-center text-muted-foreground">
              暂无支付配置，点击&ldquo;添加支付方式&rdquo;开始配置
            </CardContent>
          </Card>
        )}
      </div>

      {(editingMethod !== null || configs.length === 0) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{editingMethod ? "编辑支付方式" : "添加支付方式"}</CardTitle>
            <CardDescription>配置易支付 v1 接口参数，签名算法为 MD5</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>显示名称</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="如：易支付"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>接口凭据</Label>
                <div className="space-y-3 border rounded-lg p-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">易支付API地址（URL地址）</Label>
                    <Input
                      value={formData.credentials.apiUrl || ""}
                      onChange={(e) => handleCredentialChange("apiUrl", e.target.value)}
                      placeholder="如：https://pay.example.com"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">易支付平台的网关地址，不含 /mapi.php 等路径</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">商户ID</Label>
                    <Input
                      value={formData.credentials.merchantId || ""}
                      onChange={(e) => handleCredentialChange("merchantId", e.target.value)}
                      placeholder="如：1001"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">签名字符串（商户密钥 KEY）</Label>
                    <Input
                      type="password"
                      value={formData.credentials.secretKey || ""}
                      onChange={(e) => handleCredentialChange("secretKey", e.target.value)}
                      placeholder="易支付平台的商户密钥"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">签名算法：将请求参数按ASCII排序后拼接key=value&...&，末尾拼接此密钥，MD5加密取小写</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">默认支付方式</Label>
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      value={formData.credentials.defaultType || "alipay"}
                      onChange={(e) => handleCredentialChange("defaultType", e.target.value)}
                    >
                      {yipayTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="paymentActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                <Label htmlFor="paymentActive">启用此支付方式</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">保存</Button>
                <Button type="button" variant="outline" onClick={() => setEditingMethod(null)}>
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
