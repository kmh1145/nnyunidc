import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 获取单个产品
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    })

    if (!product) {
      return NextResponse.json({ error: "产品不存在" }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    return NextResponse.json({ error: "获取产品失败" }, { status: 500 })
  }
}

// 更新产品
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
    const body = await request.json()
    const { name, slug, description, price, originalPrice, stock, categoryId, images, specs, isActive } = body

    // 检查 slug 是否被其他产品使用
    if (slug) {
      const existing = await prisma.product.findFirst({
        where: { slug, id: { not: id } },
      })
      if (existing) {
        return NextResponse.json({ error: "产品标识已存在" }, { status: 400 })
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        price,
        originalPrice,
        stock,
        categoryId,
        images,
        specs,
        isActive,
      },
      include: { category: true },
    })

    return NextResponse.json(product)
  } catch (error) {
    return NextResponse.json({ error: "更新产品失败" }, { status: 500 })
  }
}

// 删除产品
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

    // 检查是否有关联的订单
    const orderItems = await prisma.orderItem.count({ where: { productId: id } })
    if (orderItems > 0) {
      return NextResponse.json({ error: "该产品有关联订单，无法删除" }, { status: 400 })
    }

    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "删除产品失败" }, { status: 500 })
  }
}
