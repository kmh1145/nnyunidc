import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 获取文档列表（公开）
export async function GET() {
  try {
    const docs = await prisma.docArticle.findMany({
      where: { isPublished: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    })
    return NextResponse.json(docs)
  } catch (error) {
    return NextResponse.json({ error: "获取文档失败" }, { status: 500 })
  }
}

// 创建文档（管理员）
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { title, slug, content, category, sortOrder, isPublished } = await request.json()

    if (!title || !slug || !content) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 })
    }

    const doc = await prisma.docArticle.create({
      data: { title, slug, content, category, sortOrder: sortOrder || 0, isPublished: isPublished ?? true },
    })

    return NextResponse.json(doc)
  } catch (error) {
    return NextResponse.json({ error: "创建文档失败" }, { status: 500 })
  }
}
