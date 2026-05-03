import { ServerEngine, ServerConfig, ServerInfo, ServerAction } from "./engine"

// PVE 资源配置
export interface PVEResourceStats {
  cpu: { cores: number; usage: number }
  memory: { total: number; used: number }
  disk: { total: number; used: number }
  uptime: number
}

// PVE 节点信息
export interface PVENodeInfo {
  node: string
  status: string
  cpu: number
  maxcpu: number
  mem: number
  maxmem: number
  disk: number
  maxdisk: number
  uptime: number
}

// PVE 任务信息
export interface PVETaskInfo {
  upid: string
  status: string
  exitstatus?: string
  user: string
  type: string
  id: string
  node: string
  pid: number
  starttime: number
  endtime?: number
}

export class PVEEngine implements ServerEngine {
  name = "Proxmox VE"
  platform = "PVE"
  private apiUrl: string
  private tokenId: string
  private tokenSecret: string
  private node: string = ""

  constructor(config?: { apiUrl?: string; tokenId?: string; tokenSecret?: string; node?: string }) {
    this.apiUrl = config?.apiUrl || process.env.PVE_API_URL || ""
    this.tokenId = config?.tokenId || process.env.PVE_TOKEN_ID || ""
    this.tokenSecret = config?.tokenSecret || process.env.PVE_TOKEN_SECRET || ""
    this.node = config?.node || ""
  }

  // 初始化：自动发现节点
  async init(): Promise<void> {
    if (this.node) return
    this.node = await this.getFirstNode()
  }

  // 获取第一个可用节点
  async getFirstNode(): Promise<string> {
    const nodes = await this.getNodes()
    if (!nodes.length) throw new Error("没有找到可用节点")
    return nodes[0].node
  }

  // 认证头
  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `PVEAPIToken=${this.tokenId}=${this.tokenSecret}`,
      Accept: "application/json",
    }
  }

  // 通用 API 请求
  private async apiRequest<T = any>(
    path: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: Record<string, any>
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`
    const options: RequestInit = {
      method,
      headers: this.getAuthHeaders(),
    }

    if (body) {
      options.headers = { ...options.headers, "Content-Type": "application/json" }
      options.body = JSON.stringify(body)
    }

    // 处理 TLS 自签名证书
    if (this.apiUrl.startsWith("https://")) {
      // Node.js 环境需要特殊处理
      if (typeof process !== "undefined") {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
      }
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`PVE API Error [${method} ${path}]: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data as T
  }

  // ============ 节点管理 ============

  // 获取所有节点
  private async getNodes(): Promise<PVENodeInfo[]> {
    const res = await this.apiRequest<{ data: PVENodeInfo[] }>("/nodes")
    return res.data || []
  }

  // 获取节点状态
  async getNodeStatus(node?: string): Promise<PVENodeInfo> {
    const target = node || this.node || await this.getFirstNode()
    const res = await this.apiRequest<{ data: PVENodeInfo }>(`/nodes/${target}/status`)
    return res.data
  }

  // ============ 存储和网络 ============

  // 获取存储列表
  async getStorages(node?: string): Promise<any[]> {
    const target = node || this.node || await this.getFirstNode()
    const res = await this.apiRequest<{ data: any[] }>(`/nodes/${target}/storage`)
    return res.data || []
  }

  // 获取存储内容（ISO/模板列表）
  async getStorageContent(storage: string, node?: string): Promise<any[]> {
    const target = node || this.node || await this.getFirstNode()
    const res = await this.apiRequest<{ data: any[] }>(`/nodes/${target}/storage/${storage}/content`)
    return res.data || []
  }

  // 获取网络接口列表
  async getNetworks(node?: string): Promise<any[]> {
    const target = node || this.node || await this.getFirstNode()
    const res = await this.apiRequest<{ data: any[] }>(`/nodes/${target}/network`)
    return res.data || []
  }

  // ============ VM 管理 ============

  // 获取下一个可用 VMID
  async getNextVmid(): Promise<number> {
    const res = await this.apiRequest<{ data: number }>("/cluster/nextid")
    return res.data
  }

  // 创建虚拟机
  async createServer(config: ServerConfig): Promise<ServerInfo> {
    await this.init()

    const vmid = await this.getNextVmid()
    const node = config.node || this.node

    // 生成随机 root 密码
    const password = config.password || this.generatePassword()

    // PVE 配置
    const pve = config.pve || {}
    const bridge = pve.bridge || "vmbr0"
    const storage = pve.storage || "local-lvm"
    const cpuType = pve.cpuType || "host"
    const scsiHw = pve.scsiHw || "virtio-scsi-single"
    const cacheMode = pve.cacheMode || "none"
    const useBallooning = pve.ballooning !== false
    const useAgent = pve.qemuAgent !== false
    const onboot = pve.onboot !== false

    // 网卡配置
    let netConfig = `virtio,bridge=${bridge}`
    if (pve.vlanTag) netConfig += `,tag=${pve.vlanTag}`
    if (config.bandwidth) netConfig += `,rate=${config.bandwidth}`

    // 磁盘配置
    let diskConfig = `${storage}:${config.disk}`
    if (storage === "local-lvm" || storage === "local-zfs") {
      diskConfig += `,ssd=1,discard=on,cache=${cacheMode}`
    } else {
      diskConfig += `,cache=${cacheMode}`
    }

    // Agent 配置
    let agentConfig = useAgent ? "enabled=1,fstrim_cloned_disks=1" : "enabled=0"

    const vmConfig: Record<string, any> = {
      vmid,
      name: config.hostname,
      cores: config.cpu,
      sockets: config.cpuSockets || 1,
      memory: config.memory * 1024, // GB -> MB
      balloon: useBallooning ? Math.floor(config.memory * 512) : 0,
      net0: netConfig,
      scsihw: scsiHw,
      ide2: `${storage}:iso/${config.os}.iso,media=cdrom`,
      ostype: pve.ostype || this.detectOsType(config.os),
      onboot: onboot ? 1 : 0,
      agent: agentConfig,
      cpu: cpuType,
      // Cloud-Init 配置
      ciuser: "root",
      cipassword: password,
      ipconfig0: "ip=dhcp",
      sshkeys: config.sshKey ? encodeURIComponent(config.sshKey) : undefined,
      // 磁盘
      scsi0: diskConfig,
    }

    // DNS 域名
    if (pve.dnsDomain) {
      vmConfig.searchdomain = pve.dnsDomain
    }

    try {
      // 创建 VM
      await this.apiRequest(`/nodes/${node}/qemu`, "POST", vmConfig)

      // 启动 VM（等待 cloud-init 完成）
      await this.apiRequest(`/nodes/${node}/qemu/${vmid}/status/start`, "POST")

      // 等待 VM 启动并获取 IP
      const serverInfo = await this.waitForServerReady(vmid, node, password)

      return serverInfo
    } catch (error) {
      console.error("PVE createServer error:", error)
      throw error
    }
  }

  // 等待服务器就绪
  private async waitForServerReady(vmid: number, node: string, password: string, maxRetries = 30): Promise<ServerInfo> {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      try {
        const ip = await this.getVmIp(vmid, node)
        if (ip) {
          const status = await this.getServerStatus(String(vmid))
          const config = await this.getVmConfig(vmid, node)

          return {
            serverId: String(vmid),
            hostname: config?.name || `vps-${vmid}`,
            ipAddress: ip,
            status: status,
            username: "root",
            password: password,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }
        }
      } catch {
        // 继续重试
      }
    }

    // 超时后返回基本信息
    return {
      serverId: String(vmid),
      hostname: `vps-${vmid}`,
      ipAddress: "pending",
      status: "creating",
      username: "root",
      password: password,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }
  }

  // 获取 VM IP
  private async getVmIp(vmid: number, node: string): Promise<string | null> {
    try {
      // 先 ping QEMU agent
      await this.apiRequest(`/nodes/${node}/qemu/${vmid}/agent/ping`, "POST")
    } catch {
      return null
    }

    try {
      const res = await this.apiRequest<{ data: { result: any[] } }>(
        `/nodes/${node}/qemu/${vmid}/agent/network-get-interfaces`
      )
      if (res?.data?.result) {
        for (const iface of res.data.result) {
          if (iface.name === "lo") continue
          const ip = iface["ip-addresses"]?.find(
            (addr: any) => addr["ip-address-type"] === "ipv4" && !addr["ip-address"].startsWith("127.")
          )
          if (ip) return ip["ip-address"]
        }
      }
    } catch {
      // 如果无法获取网络接口，尝试从配置中获取
      try {
        const config = await this.getVmConfig(vmid, node)
        const ipConfig = config?.ipconfig0
        if (ipConfig) {
          const match = ipConfig.match(/ip=([^,]+)/)
          if (match && match[1] !== "dhcp") return match[1]
        }
      } catch {
        // 返回 null
      }
    }

    return null
  }

  // 获取 VM 配置
  async getVmConfig(vmid: number, node?: string): Promise<any> {
    const target = node || this.node
    const res = await this.apiRequest<{ data: any }>(`/nodes/${target}/qemu/${vmid}/config`)
    return res.data
  }

  // 获取服务器信息
  async getServer(serverId: string): Promise<ServerInfo> {
    await this.init()
    const vmid = parseInt(serverId)
    const node = this.node

    try {
      const [config, status, ip] = await Promise.all([
        this.getVmConfig(vmid, node),
        this.getServerStatus(serverId),
        this.getVmIp(vmid, node),
      ])

      return {
        serverId: String(vmid),
        hostname: config?.name || `vps-${vmid}`,
        ipAddress: ip || "未知",
        status: status,
        username: "root",
        password: config?.cipassword || "",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    } catch (error) {
      console.error("PVE getServer error:", error)
      throw error
    }
  }

  // 获取服务器状态
  async getServerStatus(serverId: string): Promise<ServerInfo["status"]> {
    await this.init()
    const vmid = parseInt(serverId)

    try {
      const res = await this.apiRequest<{ data: any }>(`/nodes/${this.node}/qemu/${vmid}/status/current`)
      return this.mapStatus(res.data?.status || res.data?.qmpstatus)
    } catch {
      return "error"
    }
  }

  // 执行服务器操作
  async executeAction(serverId: string, action: ServerAction): Promise<boolean> {
    await this.init()
    const vmid = parseInt(serverId)
    const node = this.node

    try {
      switch (action.action) {
        case "start": {
          await this.apiRequest(`/nodes/${node}/qemu/${vmid}/status/start`, "POST")
          // 等待启动完成
          await this.waitForStatus(vmid, node, "running", 30)
          return true
        }
        case "stop": {
          await this.apiRequest(`/nodes/${node}/qemu/${vmid}/status/stop`, "POST")
          await this.waitForStatus(vmid, node, "stopped", 30)
          return true
        }
        case "restart": {
          await this.apiRequest(`/nodes/${node}/qemu/${vmid}/status/reset`, "POST")
          await this.waitForStatus(vmid, node, "running", 60)
          return true
        }
        case "shutdown": {
          await this.apiRequest(`/nodes/${node}/qemu/${vmid}/status/shutdown`, "POST")
          await this.waitForStatus(vmid, node, "stopped", 60)
          return true
        }
        case "reset_password": {
          const password = action.params?.password || this.generatePassword()
          await this.apiRequest(`/nodes/${node}/qemu/${vmid}/config`, "PUT", {
            cipassword: password,
          })
          return true
        }
        case "reinstall": {
          // 先停止
          await this.apiRequest(`/nodes/${node}/qemu/${vmid}/status/stop`, "POST")
          await this.waitForStatus(vmid, node, "stopped", 30)
          await new Promise(resolve => setTimeout(resolve, 3000))

          // 更新配置（更换 ISO）
          if (action.params?.os) {
            await this.apiRequest(`/nodes/${node}/qemu/${vmid}/config`, "PUT", {
              ide2: `local:iso/${action.params.os}.iso,media=cdrom`,
            })
          }

          // 重新启动
          await this.apiRequest(`/nodes/${node}/qemu/${vmid}/status/start`, "POST")
          await this.waitForStatus(vmid, node, "running", 60)
          return true
        }
        default:
          throw new Error(`不支持的操作: ${action.action}`)
      }
    } catch (error) {
      console.error("PVE executeAction error:", error)
      return false
    }
  }

  // 删除服务器
  async deleteServer(serverId: string): Promise<boolean> {
    await this.init()
    const vmid = parseInt(serverId)
    const node = this.node

    try {
      // 如果运行中先停止
      const status = await this.getServerStatus(serverId)
      if (status === "running") {
        await this.apiRequest(`/nodes/${node}/qemu/${vmid}/status/stop`, "POST")
        await this.waitForStatus(vmid, node, "stopped", 30)
      }

      // 删除 VM，同时清理磁盘
      await this.apiRequest(`/nodes/${node}/qemu/${vmid}?destroy-unreferenced-disks=1&purge=1`, "DELETE")
      return true
    } catch (error) {
      console.error("PVE deleteServer error:", error)
      return false
    }
  }

  // ============ VNC 控制台 ============

  // 获取 VNC 代理
  async getVncProxy(serverId: string): Promise<{ ticket: string; port: number; upid: string }> {
    await this.init()
    const vmid = parseInt(serverId)
    const node = this.node

    const res = await this.apiRequest<{ data: { ticket: string; port: number; upid: string } }>(
      `/nodes/${node}/qemu/${vmid}/vncproxy`,
      "POST",
      { websocket: 1 }
    )

    return res.data
  }

  // 获取 VNC WebSocket URL
  async getVncWebSocketUrl(serverId: string): Promise<string> {
    const proxy = await this.getVncProxy(serverId)
    const node = this.node
    // PVE 使用固定的 WebSocket 路径
    const wsUrl = this.apiUrl.replace(/^http/, "ws")
    return `${wsUrl}/nodes/${node}/qemu/${serverId}/vncwebsocket?port=${proxy.port}&vncticket=${encodeURIComponent(proxy.ticket)}`
  }

  // 获取 SPICE 代理
  async getSpiceProxy(serverId: string): Promise<{ proxy: string }> {
    await this.init()
    const vmid = parseInt(serverId)
    const node = this.node

    const res = await this.apiRequest<{ data: { proxy: string } }>(
      `/nodes/${node}/qemu/${vmid}/spiceproxy`,
      "POST"
    )

    return res.data
  }

  // ============ 资源监控 ============

  // 获取 VM 资源统计
  async getVmResourceStats(serverId: string): Promise<PVEResourceStats> {
    await this.init()
    const vmid = parseInt(serverId)
    const node = this.node

    try {
      const [status, config] = await Promise.all([
        this.apiRequest<{ data: any }>(`/nodes/${node}/qemu/${vmid}/status/current`),
        this.getVmConfig(vmid, node),
      ])

      const data = status.data || {}
      const maxMem = (config?.memory || 1024) * 1024 * 1024 // MB -> bytes

      return {
        cpu: {
          cores: data.cpus || config?.cores || 1,
          usage: Math.round((data.cpu || 0) * 100) / 100,
        },
        memory: {
          total: maxMem,
          used: (data.mem || 0),
        },
        disk: {
          total: (data.maxdisk || config?.scsi0?.match(/size=(\d+)G/)?.[1] || 20) * 1024 * 1024 * 1024,
          used: (data.disk || 0),
        },
        uptime: data.uptime || 0,
      }
    } catch {
      return {
        cpu: { cores: 0, usage: 0 },
        memory: { total: 0, used: 0 },
        disk: { total: 0, used: 0 },
        uptime: 0,
      }
    }
  }

  // 获取集群资源概览
  async getClusterResources(): Promise<any[]> {
    try {
      const res = await this.apiRequest<{ data: any[] }>("/cluster/resources")
      return res.data || []
    } catch {
      return []
    }
  }

  // ============ 任务管理 ============

  // 获取任务日志
  async getTaskLog(node: string, upid: string): Promise<any[]> {
    const res = await this.apiRequest<{ data: any[] }>(`/nodes/${node}/tasks/${encodeURIComponent(upid)}/log`)
    return res.data || []
  }

  // 获取任务状态
  async getTaskStatus(node: string, upid: string): Promise<PVETaskInfo> {
    const res = await this.apiRequest<{ data: PVETaskInfo }>(`/nodes/${node}/tasks/${encodeURIComponent(upid)}/status`)
    return res.data
  }

  // 获取节点上的任务列表
  async getNodeTasks(node?: string): Promise<PVETaskInfo[]> {
    const target = node || this.node
    const res = await this.apiRequest<{ data: PVETaskInfo[] }>(`/nodes/${target}/tasks`)
    return res.data || []
  }

  // ============ 系统操作 ============

  // 克隆 VM
  async cloneVm(serverId: string, newName: string, targetNode?: string): Promise<string> {
    await this.init()
    const vmid = parseInt(serverId)
    const node = this.node
    const newVmid = await this.getNextVmid()

    await this.apiRequest(`/nodes/${node}/qemu/${vmid}/clone`, "POST", {
      newid: newVmid,
      name: newName,
      target: targetNode || node,
      full: 1,
    })

    return String(newVmid)
  }

  // 创建快照
  async createSnapshot(serverId: string, snapName: string, description?: string): Promise<boolean> {
    await this.init()
    const vmid = parseInt(serverId)

    await this.apiRequest(`/nodes/${this.node}/qemu/${vmid}/snapshot`, "POST", {
      snapname: snapName,
      description: description || "",
    })

    return true
  }

  // 恢复快照
  async rollbackSnapshot(serverId: string, snapName: string): Promise<boolean> {
    await this.init()
    const vmid = parseInt(serverId)

    await this.apiRequest(`/nodes/${this.node}/qemu/${vmid}/snapshot/${snapName}/rollback`, "POST")
    return true
  }

  // 获取快照列表
  async getSnapshots(serverId: string): Promise<any[]> {
    await this.init()
    const vmid = parseInt(serverId)

    const res = await this.apiRequest<{ data: any[] }>(`/nodes/${this.node}/qemu/${vmid}/snapshot`)
    return res.data || []
  }

  // 调整 VM 配置
  async resizeVm(serverId: string, config: { cpu?: number; memory?: number; disk?: string }): Promise<boolean> {
    await this.init()
    const vmid = parseInt(serverId)
    const updateData: Record<string, any> = {}

    if (config.cpu) updateData.cores = config.cpu
    if (config.memory) updateData.memory = config.memory * 1024 // GB -> MB
    if (config.disk) updateData.scsi0 = config.disk

    await this.apiRequest(`/nodes/${this.node}/qemu/${vmid}/config`, "PUT", updateData)
    return true
  }

  // ============ 可用模板和 ISO ============

  // 获取可用模板
  async getAvailableTemplates(): Promise<Array<{ id: string; name: string; os: string }>> {
    await this.init()
    const templates: Array<{ id: string; name: string; os: string }> = []

    try {
      const storages = await this.getStorages()
      for (const storage of storages) {
        try {
          const content = await this.getStorageContent(storage.storage)
          for (const item of content) {
            if (item.content === "iso") {
              templates.push({
                id: item.volid,
                name: item.volid.split("/").pop()?.replace(".iso", "") || item.volid,
                os: this.detectOsFromIso(item.volid),
              })
            }
          }
        } catch {
          // 跳过无法访问的存储
        }
      }
    } catch {
      // 返回默认模板列表
      return [
        { id: "ubuntu-22.04", name: "Ubuntu 22.04 LTS", os: "ubuntu" },
        { id: "ubuntu-20.04", name: "Ubuntu 20.04 LTS", os: "ubuntu" },
        { id: "debian-12", name: "Debian 12", os: "debian" },
        { id: "centos-9", name: "CentOS 9 Stream", os: "centos" },
        { id: "rocky-9", name: "Rocky Linux 9", os: "rocky" },
        { id: "windows-2022", name: "Windows Server 2022", os: "windows" },
      ]
    }

    return templates.length > 0 ? templates : [
      { id: "ubuntu-22.04", name: "Ubuntu 22.04 LTS", os: "ubuntu" },
      { id: "debian-12", name: "Debian 12", os: "debian" },
      { id: "centos-9", name: "CentOS 9 Stream", os: "centos" },
    ]
  }

  // ============ 辅助方法 ============

  // 等待 VM 达到指定状态
  private async waitForStatus(vmid: number, node: string, expectedStatus: string, maxRetries: number): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      try {
        const res = await this.apiRequest<{ data: any }>(`/nodes/${node}/qemu/${vmid}/status/current`)
        const currentStatus = res.data?.status || res.data?.qmpstatus
        if (currentStatus === expectedStatus) return
      } catch {
        // 继续重试
      }
    }
  }

  // 映射状态
  private mapStatus(status: string): ServerInfo["status"] {
    if (!status) return "error"
    switch (status.toLowerCase()) {
      case "running":
        return "running"
      case "stopped":
      case "suspended":
        return "stopped"
      case "paused":
        return "stopped"
      default:
        return "error"
    }
  }

  // 检测操作系统类型
  private detectOsType(os: string): string {
    const osLower = os.toLowerCase()
    if (osLower.includes("windows")) return "win11"
    if (osLower.includes("ubuntu")) return "l26"
    if (osLower.includes("debian")) return "l26"
    if (osLower.includes("centos") || osLower.includes("rocky")) return "l26"
    return "l26" // Linux 默认
  }

  // 从 ISO 文件名检测操作系统
  private detectOsFromIso(volid: string): string {
    const name = volid.toLowerCase()
    if (name.includes("ubuntu")) return "ubuntu"
    if (name.includes("debian")) return "debian"
    if (name.includes("centos")) return "centos"
    if (name.includes("rocky")) return "rocky"
    if (name.includes("windows")) return "windows"
    return "linux"
  }

  // 生成随机密码
  private generatePassword(): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }
}
