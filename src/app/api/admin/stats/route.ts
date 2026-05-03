import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "请先登录" },
        { status: 401 }
      )
    }

    // 检查是否是管理员
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { message: "无权限访问" },
        { status: 403 }
      )
    }

    // 获取统计数据
    const [totalUsers, totalOrders, activeServers, totalRevenue] =
      await Promise.all([
        prisma.user.count(),
        prisma.order.count(),
        prisma.server.count({
          where: { status: "RUNNING" },
        }),
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: { status: { in: ["PAID", "DELIVERED"] } },
        }),
      ])

    // 获取最近订单
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    })

    // 获取服务器状态统计
    const serverStats = await prisma.server.groupBy({
      by: ["status"],
      _count: true,
    })

    return NextResponse.json({
      totalUsers,
      totalOrders,
      activeServers,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      recentOrders,
      serverStats,
    })
  } catch (error) {
    console.error("Get admin stats error:", error)
    return NextResponse.json(
      { message: "获取统计数据失败" },
      { status: 500 }
    )
  }
}
