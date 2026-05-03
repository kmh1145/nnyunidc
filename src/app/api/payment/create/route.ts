import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getPaymentGatewayFromDB } from "@/lib/payment"

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
    const { orderId, paymentMethod } = body

    if (!orderId || !paymentMethod) {
      return NextResponse.json(
        { message: "缺少必填字段" },
        { status: 400 }
      )
    }

    // 获取订单信息
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        userId: session.user.id,
      },
    })

    if (!order) {
      return NextResponse.json(
        { message: "订单不存在" },
        { status: 404 }
      )
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { message: "订单状态异常" },
        { status: 400 }
      )
    }

    // 从数据库加载支付网关配置
    const gateway = await getPaymentGatewayFromDB(paymentMethod, prisma)

    // 创建支付
    const result = await gateway.createPayment({
      orderId: order.id,
      amount: Number(order.totalAmount),
      description: `宁宁云IDC - 订单${order.id.slice(-8)}`,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback/${paymentMethod}`,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${order.id}`,
    })

    if (!result.success) {
      return NextResponse.json(
        { message: result.error || "创建支付失败" },
        { status: 500 }
      )
    }

    // 创建支付记录
    await prisma.payment.create({
      data: {
        orderId: order.id,
        paymentMethod,
        paymentId: result.paymentId || orderId,
        amount: order.totalAmount,
        status: "PENDING",
      },
    })

    return NextResponse.json({
      success: true,
      payUrl: result.payUrl,
      paymentId: result.paymentId,
    })
  } catch (error) {
    console.error("Create payment error:", error)
    return NextResponse.json(
      { message: "创建支付失败" },
      { status: 500 }
    )
  }
}
