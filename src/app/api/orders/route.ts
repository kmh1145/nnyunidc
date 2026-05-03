import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "请先登录" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, email, phone, paymentMethod, items, totalAmount } = body

    if (!name || !email || !phone || !items || items.length === 0) {
      return NextResponse.json(
        { message: "缺少必填字段" },
        { status: 400 }
      )
    }

    // 创建订单
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        totalAmount,
        paymentMethod,
        shippingAddress: {
          name,
          email,
          phone,
        },
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json(
      { message: "订单创建成功", id: order.id },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create order error:", error)
    return NextResponse.json(
      { message: "订单创建失败，请稍后重试" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "请先登录" },
        { status: 401 }
      )
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("Get orders error:", error)
    return NextResponse.json(
      { message: "获取订单列表失败" },
      { status: 500 }
    )
  }
}
