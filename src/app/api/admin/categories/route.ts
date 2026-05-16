import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 获取所有分类（公开接口，产品页面需要）
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    })
    return NextResponse.json(categories)
  } catch (error) {
    return NextResponse.json({ error: "获取分类失败" }, { status: 500 })
  }
}

// 创建分类
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, slug, description } = await request.json()

    if (!name || !slug) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 })
    }

    const existing = await prisma.category.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: "标识已存在" }, { status: 400 })
    }

    const category = await prisma.category.create({
      data: { name, slug, description },
    })

    return NextResponse.json(category)
  } catch (error) {
    return NextResponse.json({ error: "创建分类失败" }, { status: 500 })
  }
}
