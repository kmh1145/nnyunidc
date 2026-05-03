import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getPaymentGatewayFromDB } from "@/lib/payment"
import { ServerProvisioningService } from "@/lib/server/provisioning"

// 易支付异步通知回调（GET 和 POST 都支持）
export async function GET(request: Request) {
  return handleCallback(request)
}

export async function POST(request: Request) {
  return handleCallback(request)
}

async function handleCallback(request: Request) {
  try {
    // 解析参数（易支付 GET 和 POST 都可能发送回调）
    let data: Record<string, any> = {}
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/x-www-form-urlencoded") || request.method === "POST") {
      try {
        const formData = await request.formData()
        formData.forEach((value, key) => { data[key] = value })
      } catch {
        const url = new URL(request.url)
        url.searchParams.forEach((value, key) => { data[key] = value })
      }
    } else {
      const url = new URL(request.url)
      url.searchParams.forEach((value, key) => { data[key] = value })
    }

    // 从数据库加载支付网关配置
    const gateway = await getPaymentGatewayFromDB("yipay", prisma)

    // 验证回调
    const callback = await gateway.verifyCallback(data)

    if (callback.status === "success") {
      // 更新支付状态
      await prisma.payment.update({
        where: {
          orderId: callback.orderId,
        },
        data: {
          status: "SUCCESS",
          callbackData: data,
        },
      })

      // 更新订单状态
      await prisma.order.update({
        where: {
          id: callback.orderId,
        },
        data: {
          status: "PAID",
          paymentId: callback.paymentId,
        },
      })

      // 触发服务器自动开通流程（异步执行，不阻塞响应）
      ServerProvisioningService.handlePaymentSuccess(callback.orderId).catch(
        (error) => console.error("Server provisioning failed:", error)
      )
    }

    // 返回成功响应（易支付要求返回 "success"）
    return new NextResponse("success")
  } catch (error) {
    console.error("YiPay callback error:", error)
    return new NextResponse("fail", { status: 500 })
  }
}
