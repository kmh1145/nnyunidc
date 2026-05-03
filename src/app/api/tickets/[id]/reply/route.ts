import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 用户回复工单
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "回复内容不能为空" }, { status: 400 })
    }

    // 检查工单是否属于当前用户且未关闭
    const ticket = await prisma.ticket.findFirst({
      where: { id, userId: (session.user as any).id },
    })

    if (!ticket) {
      return NextResponse.json({ error: "工单不存在" }, { status: 404 })
    }

    if (ticket.status === "CLOSED") {
      return NextResponse.json({ error: "工单已关闭" }, { status: 400 })
    }

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: id,
        userId: (session.user as any).id,
        content,
        isAdmin: false,
      },
    })

    // 更新工单状态为等待回复
    await prisma.ticket.update({
      where: { id },
      data: { status: "OPEN" },
    })

    return NextResponse.json(reply)
  } catch (error) {
    return NextResponse.json({ error: "回复失败" }, { status: 500 })
  }
}
