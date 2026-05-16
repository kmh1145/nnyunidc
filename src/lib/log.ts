import { prisma } from "./db"

export async function writeLog(params: {
  type: string
  action: string
  content?: string
  userId?: string
  ip?: string
}) {
  try {
    await prisma.systemLog.create({ data: params })
  } catch { /* 日志写入失败不影响主流程 */ }
}
