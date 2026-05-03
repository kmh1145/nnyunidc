import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST() {
  try {
    // 检查是否已存在管理员
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    })

    if (existingAdmin) {
      return NextResponse.json(
        { message: "管理员已存在", email: existingAdmin.email },
        { status: 200 }
      )
    }

    // 创建默认管理员
    const hashedPassword = await bcrypt.hash("admin123456", 10)

    const admin = await prisma.user.create({
      data: {
        name: "管理员",
        email: "admin@nnyunidc.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    })

    return NextResponse.json(
      {
        message: "管理员创建成功",
        email: admin.email,
        password: "admin123456",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Setup admin error:", error)
    return NextResponse.json(
      { message: "创建管理员失败" },
      { status: 500 }
    )
  }
}
