import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getServerEngineFromDB } from "@/lib/server"

// 管理员执行服务器操作
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { action, params: actionParams } = await request.json()

    const server = await prisma.server.findUnique({ where: { id } })

    if (!server) {
      return NextResponse.json({ error: "服务器不存在" }, { status: 404 })
    }

    const engine = await getServerEngineFromDB(server.platform, prisma)
    const success = await engine.executeAction(server.serverId!, {
      action,
      params: actionParams,
    })

    if (!success) {
      return NextResponse.json({ error: "操作失败" }, { status: 500 })
    }

    // 更新状态
    const statusMap: Record<string, string> = {
      start: "RUNNING",
      stop: "STOPPED",
      shutdown: "STOPPED",
      restart: "RUNNING",
    }

    if (statusMap[action]) {
      await prisma.server.update({
        where: { id },
        data: { status: statusMap[action] as any },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin server action error:", error)
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}
