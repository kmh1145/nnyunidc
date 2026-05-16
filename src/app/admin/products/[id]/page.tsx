"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Category {
  id: string
  name: string
  slug: string
}

const OS_OPTIONS = [
  { value: "ubuntu-22.04", label: "Ubuntu 22.04 LTS" },
  { value: "ubuntu-24.04", label: "Ubuntu 24.04 LTS" },
  { value: "debian-12", label: "Debian 12" },
  { value: "centos-9", label: "CentOS 9 Stream" },
  { value: "rocky-9", label: "Rocky Linux 9" },
  { value: "almalinux-9", label: "AlmaLinux 9" },
  { value: "windows-2022", label: "Windows Server 2022" },
]

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = React.useState(false)
  const [fetching, setFetching] = React.useState(true)
  const [categories, setCategories] = React.useState<Category[]>([])
  const [formData, setFormData] = React.useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    originalPrice: "",
    stock: "",
    categoryId: "",
    isActive: true,
    platform: "PVE",
    cpu: 1,
    cpuSockets: 1,
    memory: 1,
    disk: 20,
    bandwidth: 100,
    ipCount: 1,
    osOptions: [] as string[],
    pveNode: "pve",
    pveStorage: "local-lvm",
    pveBridge: "vmbr0",
    pveCpuType: "host",
    pveScsiHw: "virtio-scsi-single",
    pveCacheMode: "none",
    pveBallooning: false,
    pveQemuAgent: true,
    pveOnboot: true,
    pveVlanTag: "",
    guarantees: [] as { title: string; description: string }[],
  })

  React.useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [productRes, catsRes] = await Promise.all([
        fetch(`/api/admin/products/${params.id}`),
        fetch("/api/admin/categories"),
      ])

      if (productRes.ok) {
        const product = await productRes.json()
        const specs = product.specs || {}
        const pve = specs.pve || {}
        setFormData({
          name: product.name, slug: product.slug,
          description: product.description || "",
          price: product.price.toString(),
          originalPrice: product.originalPrice?.toString() || "",
          stock: product.stock.toString(),
          categoryId: product.categoryId,
          isActive: product.isActive,
          platform: specs.platform || "PVE",
          cpu: specs.cpu || 1, cpuSockets: specs.cpuSockets || 1,
          memory: specs.memory || 1, disk: specs.disk || 20,
          bandwidth: specs.bandwidth || 100, ipCount: specs.ipCount || 1,
          osOptions: specs.osOptions || [],
          pveNode: pve.node || "pve", pveStorage: pve.storage || "local-lvm",
          pveBridge: pve.bridge || "vmbr0", pveCpuType: pve.cpuType || "host",
          pveScsiHw: pve.scsiHw || "virtio-scsi-single", pveCacheMode: pve.cacheMode || "none",
          pveBallooning: pve.ballooning || false, pveQemuAgent: pve.qemuAgent !== false,
          pveOnboot: pve.onboot !== false, pveVlanTag: pve.vlanTag || "",
          guarantees: specs.guarantees || [],
        })
      }

      if (catsRes.ok) {
        setCategories(await catsRes.json())
      }
    } catch (error) {
      console.error("获取数据失败:", error)
    } finally {
      setFetching(false)
    }
  }

  function toggleOsOption(os: string) {
    setFormData(prev => ({
      ...prev,
      osOptions: prev.osOptions.includes(os)
        ? prev.osOptions.filter(o => o !== os)
        : [...prev.osOptions, os],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const specs = {
        platform: formData.platform,
        cpu: formData.cpu, cpuSockets: formData.cpuSockets,
        memory: formData.memory, disk: formData.disk,
        bandwidth: formData.bandwidth, ipCount: formData.ipCount,
        osOptions: formData.osOptions,
        guarantees: formData.guarantees.filter(g => g.title.trim()),
        pve: {
          node: formData.pveNode, storage: formData.pveStorage,
          bridge: formData.pveBridge, cpuType: formData.pveCpuType,
          scsiHw: formData.pveScsiHw, cacheMode: formData.pveCacheMode,
          ballooning: formData.pveBallooning, qemuAgent: formData.pveQemuAgent,
          onboot: formData.pveOnboot, vlanTag: formData.pveVlanTag || undefined,
        },
      }

      const res = await fetch(`/api/admin/products/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          price: parseFloat(formData.price),
          originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
          stock: parseInt(formData.stock),
          categoryId: formData.categoryId,
          specs,
          isActive: formData.isActive,
        }),
      })

      if (res.ok) {
        router.push("/admin/products")
      } else {
        const data = await res.json()
        alert(data.error || "更新失败")
      }
    } catch (error) {
      console.error("更新失败:", error)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="container py-8">加载中...</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">编辑产品</h1>
        <p className="text-muted-foreground">修改产品信息</p>
      </div>

      <form method="post" onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">产品名称 *</Label>
                <Input id="name" value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">产品标识 *</Label>
                <Input id="slug" value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">产品描述</Label>
              <textarea id="description"
                className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">产品分类 *</Label>
                <select id="category" className="w-full rounded-md border px-3 py-2 text-sm"
                  value={formData.categoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))} required>
                  <option value="">请选择分类</option>
                  {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">服务器平台</Label>
                <select id="platform" className="w-full rounded-md border px-3 py-2 text-sm"
                  value={formData.platform}
                  onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}>
                  <option value="PVE">Proxmox VE</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">售价 (元/月) *</Label>
                <Input id="price" type="number" min="0" step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originalPrice">原价 (元/月)</Label>
                <Input id="originalPrice" type="number" min="0" step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">库存 *</Label>
                <Input id="stock" type="number" min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))} required />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))} />
              <Label htmlFor="isActive">上架销售</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>服务器配置</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="cpu">CPU 核心数</Label>
                <Input id="cpu" type="number" min={1} value={formData.cpu}
                  onChange={(e) => setFormData(prev => ({ ...prev, cpu: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memory">内存 (GB)</Label>
                <Input id="memory" type="number" min={0.5} step={0.5} value={formData.memory}
                  onChange={(e) => setFormData(prev => ({ ...prev, memory: parseFloat(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disk">系统盘 (GB)</Label>
                <Input id="disk" type="number" min={10} value={formData.disk}
                  onChange={(e) => setFormData(prev => ({ ...prev, disk: parseInt(e.target.value) || 20 }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bandwidth">带宽 (Mbps)</Label>
                <Input id="bandwidth" type="number" min={1} value={formData.bandwidth}
                  onChange={(e) => setFormData(prev => ({ ...prev, bandwidth: parseInt(e.target.value) || 100 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ipCount">IP 数量</Label>
              <Input id="ipCount" type="number" min={1} value={formData.ipCount}
                onChange={(e) => setFormData(prev => ({ ...prev, ipCount: parseInt(e.target.value) || 1 }))}
                className="max-w-[200px]" />
            </div>
            <div className="space-y-2">
              <Label>可选操作系统</Label>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {OS_OPTIONS.map(os => (
                  <label key={os.value} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border hover:bg-muted">
                    <input type="checkbox"
                      checked={formData.osOptions.includes(os.value)}
                      onChange={() => toggleOsOption(os.value)} />
                    {os.label}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>服务保障</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {formData.guarantees.map((g, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input value={g.title}
                    onChange={e => {
                      const next = [...formData.guarantees]
                      next[i] = { ...next[i], title: e.target.value }
                      setFormData(prev => ({ ...prev, guarantees: next }))
                    }}
                    placeholder="保障标题" />
                </div>
                <Button variant="ghost" size="sm" className="shrink-0 text-red-500"
                  onClick={() => setFormData(prev => ({ ...prev, guarantees: prev.guarantees.filter((_, j) => j !== i) }))}>
                  删除
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => setFormData(prev => ({ ...prev, guarantees: [...prev.guarantees, { title: "", description: "" }] }))}>
              + 添加保障
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? "保存中..." : "保存修改"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>取消</Button>
        </div>
      </form>
    </div>
  )
}
