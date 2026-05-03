import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 用户获取单个工单详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  try {
    const { id } = await params
    const ticket = await prisma.ticket.findFirst({
      where: { id, userId: (session.user as any).id },
      include: {
        replies: { orderBy: { createdAt: "asc" } },
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

// 用户关闭工单
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  try {
    const { id } = await params
    const ticket = await prisma.ticket.updateMany({
      where: { id, userId: (session.user as any).id },
      data: { status: "CLOSED" },
    })

    if (ticket.count === 0) {
      return NextResponse.json({ error: "工单不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "关闭工单失败" }, { status: 500 })
  }
}
