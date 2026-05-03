import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getServerEngineFromDB } from "@/lib/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "请先登录" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action } = body

    // 获取服务器信息
    const server = await prisma.server.findUnique({
      where: {
        id,
        userId: (session.user as any).id,
      },
    })

    if (!server) {
      return NextResponse.json(
        { message: "服务器不存在" },
        { status: 404 }
      )
    }

    // 从数据库加载平台配置获取引擎
    const engine = await getServerEngineFromDB(server.platform, prisma)

    // 执行操作
    const success = await engine.executeAction(server.serverId!, {
      action: action,
    })

    if (!success) {
      return NextResponse.json(
        { message: "操作失败" },
        { status: 500 }
      )
    }

    // 更新服务器状态
    let newStatus = server.status
    switch (action) {
      case "start":
        newStatus = "RUNNING"
        break
      case "stop":
      case "shutdown":
        newStatus = "STOPPED"
        break
      case "restart":
        newStatus = "RUNNING"
        break
    }

    await prisma.server.update({
      where: { id },
      data: { status: newStatus as any },
    })

    return NextResponse.json({
      message: "操作成功",
      status: newStatus,
    })
  } catch (error) {
    console.error("Server action error:", error)
    return NextResponse.json(
      { message: "操作失败，请检查平台是否已配置" },
      { status: 500 }
    )
  }
}
