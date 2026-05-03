import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 更新分类
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
    const { name, slug, description } = await request.json()

    if (slug) {
      const existing = await prisma.category.findFirst({
        where: { slug, id: { not: id } },
      })
      if (existing) {
        return NextResponse.json({ error: "标识已存在" }, { status: 400 })
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name, slug, description },
    })

    return NextResponse.json(category)
  } catch (error) {
    return NextResponse.json({ error: "更新分类失败" }, { status: 500 })
  }
}

// 删除分类
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    // 检查分类下是否有产品
    const count = await prisma.product.count({ where: { categoryId: id } })
    if (count > 0) {
      return NextResponse.json({ error: `该分类下有 ${count} 个产品，无法删除` }, { status: 400 })
    }

    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "删除分类失败" }, { status: 500 })
  }
}
