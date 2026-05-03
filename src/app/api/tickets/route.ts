import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 用户获取自己的工单列表
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId: (session.user as any).id },
      include: {
        replies: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(tickets)
  } catch (error) {
    return NextResponse.json({ error: "获取工单列表失败" }, { status: 500 })
  }
}

// 用户创建工单
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  try {
    const { subject, content, department, priority } = await request.json()

    if (!subject || !content || !department) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 })
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId: (session.user as any).id,
        subject,
        content,
        department,
        priority: priority || "MEDIUM",
      },
    })

    return NextResponse.json(ticket)
  } catch (error) {
    return NextResponse.json({ error: "创建工单失败" }, { status: 500 })
  }
}
