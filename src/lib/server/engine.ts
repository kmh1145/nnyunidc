// 服务器开通引擎接口 - 模块化设计，支持多种虚拟化平台

export interface ServerConfig {
  hostname: string
  os: string
  cpu: number
  cpuCores?: number
  cpuSockets?: number
  memory: number
  disk: number
  bandwidth: number
  password?: string
  sshKey?: string
  userData?: string
  node?: string
  pve?: {
    node?: string
    storage?: string
    bridge?: string
    cpuType?: string
    scsiHw?: string
    diskType?: string
    cacheMode?: string
    ballooning?: boolean
    qemuAgent?: boolean
    onboot?: boolean
    ostype?: string
    vlanTag?: string
    dnsDomain?: string
  }
}

export interface ServerInfo {
  serverId: string
  hostname: string
  ipAddress: string
  status: "creating" | "running" | "stopped" | "error" | "expired"
  username: string
  password: string
  vncPort?: number
  createdAt: Date
  expiresAt: Date
}

export interface ServerAction {
  action: "start" | "stop" | "restart" | "shutdown" | "reinstall" | "reset_password"
  params?: Record<string, any>
}

export interface ServerEngine {
  name: string
  platform: string

  // 创建服务器
  createServer(config: ServerConfig): Promise<ServerInfo>

  // 获取服务器信息
  getServer(serverId: string): Promise<ServerInfo>

  // 执行服务器操作
  executeAction(serverId: string, action: ServerAction): Promise<boolean>

  // 删除服务器
  deleteServer(serverId: string): Promise<boolean>

  // 获取服务器状态
  getServerStatus(serverId: string): Promise<ServerInfo["status"]>

  // 获取可用模板/镜像
  getAvailableTemplates(): Promise<Array<{ id: string; name: string; os: string }>>
}
