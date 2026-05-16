"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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

const PVE_CPU_TYPES = [
  { value: "host", label: "host (推荐 - 直通CPU)" },
  { value: "kvm64", label: "kvm64 (兼容模式)" },
  { value: "x86-64-v2-AES", label: "x86-64-v2-AES" },
  { value: "x86-64-v3", label: "x86-64-v3" },
  { value: "max", label: "max" },
]

const PVE_SCSI_TYPES = [
  { value: "virtio-scsi-single", label: "VirtIO SCSI Single (推荐)" },
  { value: "virtio-scsi-pci", label: "VirtIO SCSI PCI" },
  { value: "virtio-blk", label: "VirtIO Block" },
]

const PVE_DISK_TYPES = [
  { value: "local-lvm", label: "local-lvm (精简卷)" },
  { value: "local-zfs", label: "local-zfs (ZFS)" },
  { value: "local", label: "local (目录存储)" },
]

const PVE_CACHE_MODES = [
  { value: "none", label: "none (推荐 - 宿主机缓存)" },
  { value: "writeback", label: "writeback (最佳性能)" },
  { value: "writethrough", label: "writethrough (安全性)" },
  { value: "directsync", label: "directsync" },
  { value: "unsafe", label: "unsafe (最高性能)" },
]

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [categories, setCategories] = React.useState<Category[]>([])
  const [formData, setFormData] = React.useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    originalPrice: "",
    stock: "9999",
    categoryId: "",
    isActive: true,
    // 服务器开通配置 - 通用
    platform: "PVE",
    cpu: 1,
    cpuCores: 1,
    cpuSockets: 1,
    memory: 1,
    disk: 20,
    bandwidth: 100,
    ipCount: 1,
    osOptions: ["ubuntu-22.04", "debian-12"],
    // PVE 专属配置
    pveNode: "pve",
    pveStorage: "local-lvm",
    pveBridge: "vmbr0",
    pveCpuType: "host",
    pveScsiHw: "virtio-scsi-single",
    pveDiskType: "local-lvm",
    pveCacheMode: "none",
    pveBallooning: false,
    pveQemuAgent: true,
    pveOnboot: true,
    pveOstype: "l26",
    pveVlanTag: "",
    pveDnsDomain: "",
    // 服务保障
    guarantees: [] as { title: string; description: string }[],
  })

  React.useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    try {
      const res = await fetch("/api/admin/categories")
      if (res.ok) {
        setCategories(await res.json())
      }
    } catch (error) {
      console.error("获取分类失败:", error)
    }
  }

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim()
  }

  function handleNameChange(name: string) {
    setFormData(prev => ({ ...prev, name, slug: generateSlug(name) }))
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
        cpu: formData.cpu,
        memory: formData.memory,
        disk: formData.disk,
        bandwidth: formData.bandwidth,
        ipCount: formData.ipCount,
        osOptions: formData.osOptions,
        guarantees: formData.guarantees.filter(g => g.title.trim()),
        pve: {
          node: formData.pveNode,
          storage: formData.pveStorage,
          bridge: formData.pveBridge,
          cpuType: formData.pveCpuType,
          scsiHw: formData.pveScsiHw,
          diskType: formData.pveDiskType,
          cacheMode: formData.pveCacheMode,
          ballooning: formData.pveBallooning,
          qemuAgent: formData.pveQemuAgent,
          onboot: formData.pveOnboot,
          ostype: formData.pveOstype,
          vlanTag: formData.pveVlanTag || undefined,
          dnsDomain: formData.pveDnsDomain || undefined,
        },
      }

      const res = await fetch("/api/admin/products", {
        method: "POST",
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
        alert(data.error || "创建失败")
      }
    } catch (error) {
      console.error("创建失败:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">添加产品</h1>
        <p className="text-muted-foreground">创建新的服务器产品</p>
      </div>

      <form method="post" onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">产品名称 *</Label>
                <Input id="name" value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="如：入门型 VPS" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">产品标识 *</Label>
                <Input id="slug" value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="如：starter-vps" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">产品描述</Label>
              <textarea id="description"
                className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="产品描述..." />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">产品分类 *</Label>
                <select id="category"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={formData.categoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                  required>
                  <option value="">请选择分类</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">服务器平台</Label>
                <select id="platform"
                  className="w-full rounded-md border px-3 py-2 text-sm"
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
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="49.00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originalPrice">原价 (元/月)</Label>
                <Input id="originalPrice" type="number" min="0" step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                  placeholder="69.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">库存数量 *</Label>
                <Input id="stock" type="number" min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  required />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))} />
              <Label htmlFor="isActive">立即上架</Label>
            </div>
          </CardContent>
        </Card>

        {/* 服务器配置 */}
        <Card>
          <CardHeader>
            <CardTitle>服务器配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="cpu">CPU 核心数</Label>
                <Input id="cpu" type="number" min={1} max={128}
                  value={formData.cpu}
                  onChange={(e) => setFormData(prev => ({ ...prev, cpu: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memory">内存 (GB)</Label>
                <Input id="memory" type="number" min={0.5} step={0.5}
                  value={formData.memory}
                  onChange={(e) => setFormData(prev => ({ ...prev, memory: parseFloat(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disk">系统盘 (GB)</Label>
                <Input id="disk" type="number" min={10}
                  value={formData.disk}
                  onChange={(e) => setFormData(prev => ({ ...prev, disk: parseInt(e.target.value) || 20 }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bandwidth">带宽 (Mbps)</Label>
                <Input id="bandwidth" type="number" min={1}
                  value={formData.bandwidth}
                  onChange={(e) => setFormData(prev => ({ ...prev, bandwidth: parseInt(e.target.value) || 100 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ipCount">IP 数量</Label>
              <Input id="ipCount" type="number" min={1}
                value={formData.ipCount}
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

        {/* PVE 专属配置 */}
        <Card>
          <CardHeader>
            <CardTitle>PVE 平台配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>节点名称</Label>
                <Input value={formData.pveNode}
                  onChange={e => setFormData(prev => ({ ...prev, pveNode: e.target.value }))}
                  placeholder="如：pve" />
                <p className="text-xs text-muted-foreground">PVE 节点主机名</p>
              </div>
              <div className="space-y-2">
                <Label>存储池</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={formData.pveStorage}
                  onChange={e => setFormData(prev => ({ ...prev, pveStorage: e.target.value }))}>
                  {PVE_DISK_TYPES.map(d => (<option key={d.value} value={d.value}>{d.label}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>网桥</Label>
                <Input value={formData.pveBridge}
                  onChange={e => setFormData(prev => ({ ...prev, pveBridge: e.target.value }))}
                  placeholder="vmbr0" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>CPU 类型</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={formData.pveCpuType}
                  onChange={e => setFormData(prev => ({ ...prev, pveCpuType: e.target.value }))}>
                  {PVE_CPU_TYPES.map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>SCSI 控制器</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={formData.pveScsiHw}
                  onChange={e => setFormData(prev => ({ ...prev, pveScsiHw: e.target.value }))}>
                  {PVE_SCSI_TYPES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>磁盘缓存模式</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={formData.pveCacheMode}
                  onChange={e => setFormData(prev => ({ ...prev, pveCacheMode: e.target.value }))}>
                  {PVE_CACHE_MODES.map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pveVlan">VLAN Tag（留空不使用）</Label>
              <Input id="pveVlan" type="number" min={1} max={4094}
                value={formData.pveVlanTag}
                onChange={e => setFormData(prev => ({ ...prev, pveVlanTag: e.target.value }))}
                placeholder="如：100" className="max-w-[200px]" />
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formData.pveBallooning}
                  onChange={e => setFormData(prev => ({ ...prev, pveBallooning: e.target.checked }))} />
                内存气球（ballooning）
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formData.pveQemuAgent}
                  onChange={e => setFormData(prev => ({ ...prev, pveQemuAgent: e.target.checked }))} />
                QEMU Guest Agent
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formData.pveOnboot}
                  onChange={e => setFormData(prev => ({ ...prev, pveOnboot: e.target.checked }))} />
                开机自启
              </label>
            </div>
          </CardContent>
        </Card>

        {/* 服务保障 */}
        <Card>
          <CardHeader>
            <CardTitle>服务保障</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.guarantees.map((g, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    value={g.title}
                    onChange={e => {
                      const next = [...formData.guarantees]
                      next[i] = { ...next[i], title: e.target.value }
                      setFormData(prev => ({ ...prev, guarantees: next }))
                    }}
                    placeholder="保障标题，如：99.9% 正常运行时间保障"
                  />
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
          <Button type="submit" disabled={loading}>
            {loading ? "创建中..." : "创建产品"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>取消</Button>
        </div>
      </form>
    </div>
  )
}
