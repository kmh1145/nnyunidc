import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "请填写当前密码和新密码" }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "密码长度不能少于6位" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const isCorrect = await bcrypt.compare(currentPassword, user.password)
    if (!isCorrect) {
      return NextResponse.json({ error: "当前密码错误" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "修改密码失败" }, { status: 500 })
  }
}
