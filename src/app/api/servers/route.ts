import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "请先登录" },
        { status: 401 }
      )
    }

    const servers = await prisma.server.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        order: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(servers)
  } catch (error) {
    console.error("Get servers error:", error)
    return NextResponse.json(
      { message: "获取服务器列表失败" },
      { status: 500 }
    )
  }
}
