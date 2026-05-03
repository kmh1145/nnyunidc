import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 管理员获取所有工单
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const department = searchParams.get("department")

    const where: any = {}

    if (status && status !== "all") {
      where.status = status
    }

    if (department && department !== "all") {
      where.department = department
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        replies: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(tickets)
  } catch (error) {
    return NextResponse.json({ error: "获取工单列表失败" }, { status: 500 })
  }
}
