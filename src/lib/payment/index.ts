import { PaymentGateway } from "./gateway"
import { YiPayGateway } from "./yipay"

// 从数据库加载支付配置并获取网关
export async function getPaymentGatewayFromDB(method: string, prisma: any): Promise<PaymentGateway> {
  const config = await prisma.paymentConfig.findUnique({
    where: { method },
  })

  if (!config) {
    throw new Error(`支付方式 ${method} 未配置，请在管理员后台设置`)
  }

  if (!config.isActive) {
    throw new Error(`支付方式 ${method} 已被禁用`)
  }

  const credentials = (config.credentials || {}) as Record<string, string>

  switch (method) {
    case "yipay":
      return new YiPayGateway({
        apiUrl: credentials.apiUrl,
        merchantId: credentials.merchantId,
        secretKey: credentials.secretKey,
        defaultType: credentials.defaultType || "alipay",
      })
    default:
      throw new Error(`不支持的支付方式: ${method}`)
  }
}

// 直接获取支付网关（供简单场景使用）
export function getPaymentGateway(method: string): PaymentGateway {
  switch (method) {
    case "yipay":
      return new YiPayGateway()
    default:
      throw new Error(`Unsupported payment method: ${method}`)
  }
}

export type { PaymentGateway, PaymentOrder, PaymentResult, PaymentCallback } from "./gateway"
