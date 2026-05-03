"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PlatformConfig {
  id: string
  platform: string
  name: string
  apiUrl: string
  credentials: Record<string, string>
  settings?: Record<string, any>
  isActive: boolean
}

const platformOptions = [
  { value: "PVE", label: "Proxmox VE", fields: ["tokenId", "tokenSecret", "node"] },
]

export default function PlatformsPage() {
  const [configs, setConfigs] = React.useState<PlatformConfig[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editingPlatform, setEditingPlatform] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState({
    platform: "PVE",
    name: "",
    apiUrl: "",
    credentials: {} as Record<string, string>,
    isActive: true,
  })

  React.useEffect(() => {
    fetchConfigs()
  }, [])

  async function fetchConfigs() {
    try {
      const res = await fetch("/api/admin/platforms")
      if (res.ok) {
        const data = await res.json()
        setConfigs(data)
      }
    } catch (error) {
      console.error("获取平台配置失败:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(config: PlatformConfig) {
    setEditingPlatform(config.platform)
    setFormData({
      platform: config.platform,
      name: config.name,
      apiUrl: config.apiUrl,
      credentials: config.credentials,
      isActive: config.isActive,
    })
  }

  function handleNew() {
    setEditingPlatform(null)
    setFormData({
      platform: "PVE",
      name: "",
      apiUrl: "",
      credentials: {},
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
      const res = await fetch("/api/admin/platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        await fetchConfigs()
        setEditingPlatform(null)
      }
    } catch (error) {
      console.error("保存失败:", error)
    }
  }

  function getPlatformLabel(platform: string) {
    return platformOptions.find(p => p.value === platform)?.label || platform
  }

  function getPlatformFields(platform: string) {
    return platformOptions.find(p => p.value === platform)?.fields || []
  }

  if (loading) {
    return <div className="container py-8">加载中...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">接口管理</h1>
          <p className="text-muted-foreground">管理服务器平台API连接配置</p>
        </div>
        <Button onClick={handleNew}>添加平台</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {configs.map((config) => (
          <Card key={config.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{config.name}</CardTitle>
                  <CardDescription>{getPlatformLabel(config.platform)}</CardDescription>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  config.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                }`}>
                  {config.isActive ? "已启用" : "已禁用"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                API地址: {config.apiUrl}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                  编辑
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {configs.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="py-8 text-center text-muted-foreground">
              暂无平台配置，点击&ldquo;添加平台&rdquo;开始配置
            </CardContent>
          </Card>
        )}
      </div>

      {(editingPlatform !== null || formData.platform) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{editingPlatform ? "编辑平台" : "添加平台"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>平台类型</Label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={formData.platform}
                    onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                    disabled={!!editingPlatform}
                  >
                    {platformOptions.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>显示名称</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="如：生产环境PVE"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>API地址</Label>
                <Input
                  value={formData.apiUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiUrl: e.target.value }))}
                  placeholder="如：https://pve.example.com:8006/api2/json"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>认证凭据</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {getPlatformFields(formData.platform).map((field) => (
                    <div key={field}>
                      <Label className="text-xs text-muted-foreground">{field}</Label>
                      <Input
                        type={field.includes("secret") || field.includes("Key") ? "password" : "text"}
                        value={formData.credentials[field] || ""}
                        onChange={(e) => handleCredentialChange(field, e.target.value)}
                        placeholder={`请输入${field}`}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                <Label htmlFor="isActive">启用此平台</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">保存</Button>
                <Button type="button" variant="outline" onClick={() => setEditingPlatform(null)}>
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
