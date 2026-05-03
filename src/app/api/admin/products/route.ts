import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 获取所有产品（管理员）
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const category = searchParams.get("category")

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ]
    }

    if (category && category !== "all") {
      where.category = { slug: category }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    })

    return NextResponse.json(products)
  } catch (error) {
    return NextResponse.json({ error: "获取产品列表失败" }, { status: 500 })
  }
}

// 创建产品
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, slug, description, price, originalPrice, stock, categoryId, images, specs, isActive } = body

    if (!name || !slug || !price || !stock || !categoryId) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 })
    }

    // 检查 slug 是否已存在
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: "产品标识已存在" }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price,
        originalPrice,
        stock,
        categoryId,
        images: images || [],
        specs: specs || {},
        isActive: isActive ?? true,
      },
      include: { category: true },
    })

    return NextResponse.json(product)
  } catch (error) {
    return NextResponse.json({ error: "创建产品失败" }, { status: 500 })
  }
}
