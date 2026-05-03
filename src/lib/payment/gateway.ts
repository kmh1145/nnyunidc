// 支付网关接口 - 模块化设计，支持多种支付渠道

export interface PaymentOrder {
  orderId: string
  amount: number
  description: string
  callbackUrl: string
  returnUrl: string
}

export interface PaymentResult {
  success: boolean
  paymentId?: string
  payUrl?: string
  formData?: Record<string, string>
  error?: string
}

export interface PaymentCallback {
  paymentId: string
  orderId: string
  amount: number
  status: "success" | "failed" | "pending"
  raw: Record<string, any>
}

export interface PaymentGateway {
  name: string
  createPayment(order: PaymentOrder): Promise<PaymentResult>
  verifyCallback(data: Record<string, any>): Promise<PaymentCallback>
  queryPayment(paymentId: string): Promise<PaymentCallback>
}
