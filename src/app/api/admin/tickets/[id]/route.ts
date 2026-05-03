import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 管理员获取工单详情
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
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        replies: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: "工单不存在" }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    return NextResponse.json({ error: "获取工单详情失败" }, { status: 500 })
  }
}

// 管理员更新工单状态
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { status } = await request.json()

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json(ticket)
  } catch (error) {
    return NextResponse.json({ error: "更新工单状态失败" }, { status: 500 })
  }
}
