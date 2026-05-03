import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getServerEngineFromDB } from "@/lib/server"

// 获取所有服务器（管理员）
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const platform = searchParams.get("platform")
    const status = searchParams.get("status")

    const where: any = {}

    if (search) {
      where.OR = [
        { hostname: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search } },
      ]
    }

    if (platform && platform !== "all") {
      where.platform = platform
    }

    if (status && status !== "all") {
      where.status = status
    }

    const servers = await prisma.server.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, totalAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(servers)
  } catch (error) {
    return NextResponse.json({ error: "获取服务器列表失败" }, { status: 500 })
  }
}
