import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 更新文档
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
    const { title, slug, content, category, sortOrder, isPublished } = await request.json()

    if (slug) {
      const existing = await prisma.docArticle.findFirst({ where: { slug, id: { not: id } } })
      if (existing) return NextResponse.json({ error: "标识已存在" }, { status: 400 })
    }

    const doc = await prisma.docArticle.update({
      where: { id },
      data: { title, slug, content, category, sortOrder, isPublished },
    })
    return NextResponse.json(doc)
  } catch (error) {
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}

// 删除文档
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
    await prisma.docArticle.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
