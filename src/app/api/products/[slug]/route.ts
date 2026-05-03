import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const product = await prisma.product.findUnique({
      where: {
        slug,
        isActive: true,
      },
      include: {
        category: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { message: "产品不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Get product error:", error)
    return NextResponse.json(
      { message: "获取产品信息失败" },
      { status: 500 }
    )
  }
}
