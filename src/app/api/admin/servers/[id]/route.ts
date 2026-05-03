import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getServerEngineFromDB } from "@/lib/server"

// 获取单个服务器详情（管理员）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const server = await prisma.server.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, totalAmount: true } },
      },
    })

    if (!server) {
      return NextResponse.json({ error: "服务器不存在" }, { status: 404 })
    }

    return NextResponse.json(server)
  } catch (error) {
    return NextResponse.json({ error: "获取服务器详情失败" }, { status: 500 })
  }
}

// 删除服务器（管理员）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const server = await prisma.server.findUnique({ where: { id } })

    if (!server) {
      return NextResponse.json({ error: "服务器不存在" }, { status: 404 })
    }

    // 如果平台配置存在，则删除实际服务器
    try {
      const engine = await getServerEngineFromDB(server.platform, prisma)
      await engine.deleteServer(server.serverId!)
    } catch {
      // 即使远程删除失败，也删除数据库记录
      console.warn("Failed to delete remote server, removing from DB")
    }

    await prisma.server.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "删除服务器失败" }, { status: 500 })
  }
}
