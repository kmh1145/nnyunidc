import { ServerEngine } from "./engine"
import { PVEEngine } from "./pve"

// 从数据库加载平台配置并获取引擎
export async function getServerEngineFromDB(platform: string, prisma: any): Promise<ServerEngine> {
  const config = await prisma.platformConfig.findUnique({
    where: { platform },
  })

  if (!config) {
    throw new Error(`平台 ${platform} 未配置`)
  }

  const credentials = (config.credentials || {}) as Record<string, string>
  return new PVEEngine({
    apiUrl: config.apiUrl,
    tokenId: credentials.tokenId,
    tokenSecret: credentials.tokenSecret,
    node: credentials.node,
  })
}

export type { ServerEngine, ServerConfig, ServerInfo, ServerAction } from "./engine"
