import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "未登录" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, phone } = body

    if (!name) {
      return NextResponse.json(
        { message: "姓名不能为空" },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        phone: phone || null,
      }
    })

    return NextResponse.json(
      { message: "更新成功", user: { id: updatedUser.id, name: updatedUser.name, phone: updatedUser.phone } },
      { status: 200 }
    )
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json(
      { message: "更新失败，请稍后重试" },
      { status: 500 }
    )
  }
}
