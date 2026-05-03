import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 批量更新排序
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { type, items } = await request.json()
    // items: { id: string, sortOrder: number }[]

    if (!type || !items?.length) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 })
    }

    if (type === "category") {
      for (const item of items) {
        await prisma.category.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      }
    } else if (type === "product") {
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      }
    } else {
      return NextResponse.json({ error: "未知类型" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "更新排序失败" }, { status: 500 })
  }
}
