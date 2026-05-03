import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 管理员回复工单
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "回复内容不能为空" }, { status: 400 })
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } })

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
        isAdmin: true,
      },
    })

    // 更新工单状态为已回复
    await prisma.ticket.update({
      where: { id },
      data: { status: "REPLIED" },
    })

    return NextResponse.json(reply)
  } catch (error) {
    return NextResponse.json({ error: "回复失败" }, { status: 500 })
  }
}
